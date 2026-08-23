const EXPECTED_MANIFEST_SHA256: &str =
    "54fdba46e557dc9665e0b9b4ab1e9c739ed62b03783650bd333bcf463d83f7b4";

#[derive(Debug)]
struct AssetPolicy {
    origin: String,
    asset_path: String,
}

impl AssetPolicy {
    fn from_worker(worker_url: &str) -> Result<Self, RuntimeError> {
        let url = parse_url(worker_url, worker_url)?;
        if !matches!(url.protocol().as_str(), "http:" | "https:")
            || !url.username().is_empty()
            || !url.password().is_empty()
            || !url.search().is_empty()
            || !url.hash().is_empty()
        {
            return Err(policy_error("invalid Worker URL"));
        }
        let pathname = url.pathname();
        let Some((deployment_path, _filename)) = pathname.rsplit_once('/') else {
            return Err(policy_error("Worker URL has no deployment base"));
        };
        Ok(Self {
            origin: url.origin(),
            asset_path: format!("{deployment_path}/models/edu/"),
        })
    }

    fn manifest_url(&self, supplied: &str, worker_url: &str) -> Result<String, RuntimeError> {
        if !transformer_viz_worker::asset_policy::canonical_manifest_request(supplied) {
            return Err(policy_error("unexpected manifest location"));
        }
        self.resolve_and_validate(supplied, worker_url, "manifest.json")
    }

    fn child_url(&self, filename: &str, manifest_url: &str) -> Result<String, RuntimeError> {
        if !transformer_viz_worker::asset_policy::canonical_child_filename(filename) {
            return Err(policy_error("unexpected manifest child filename"));
        }
        self.resolve_and_validate(filename, manifest_url, filename)
    }

    fn validate_final(&self, href: &str, filename: &str) -> Result<(), RuntimeError> {
        let url = parse_url(href, href)?;
        if !matches!(url.protocol().as_str(), "http:" | "https:")
            || url.origin() != self.origin
            || !url.username().is_empty()
            || !url.password().is_empty()
            || !url.search().is_empty()
            || !url.hash().is_empty()
            || url.pathname() != format!("{}{filename}", self.asset_path)
        {
            return Err(policy_error(
                "asset URL escaped the deployment model directory",
            ));
        }
        Ok(())
    }

    fn resolve_and_validate(
        &self,
        supplied: &str,
        base: &str,
        filename: &str,
    ) -> Result<String, RuntimeError> {
        if transformer_viz_worker::asset_policy::has_url_escape(supplied) {
            return Err(policy_error("encoded, escaped, or fragmented asset URL"));
        }
        let href = parse_url(supplied, base)?.href();
        self.validate_final(&href, filename)?;
        Ok(href)
    }
}

fn parse_url(value: &str, base: &str) -> Result<Url, RuntimeError> {
    Url::new_with_base(value, base)
        .map_err(|error| RuntimeError::AssetUnavailable(format!("invalid asset URL: {error:?}")))
}

fn policy_error(detail: &str) -> RuntimeError {
    RuntimeError::AssetUnavailable(format!("asset URL policy rejected {detail}"))
}

fn fetch_bounded<'a>(
    policy: &'a AssetPolicy,
    url: String,
    filename: &'a str,
    maximum: u64,
    exact_size: Option<u64>,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<u8>, RuntimeError>> + 'a>> {
    Box::pin(async move {
        policy.validate_final(&url, filename)?;
        let response = Request::get(&url)
            .redirect(web_sys::RequestRedirect::Error)
            .send()
            .await
            .map_err(|error| RuntimeError::AssetUnavailable(error.to_string()))?;
        if !response.ok() {
            return Err(RuntimeError::AssetUnavailable(format!(
                "HTTP {}: {url}",
                response.status()
            )));
        }
        policy.validate_final(&response.url(), filename)?;
        let declared = response
            .headers()
            .get("content-length")
            .ok_or_else(|| {
                RuntimeError::AssetUnavailable("asset response has no Content-Length".to_owned())
            })?
            .parse::<u64>()
            .map_err(|_| {
                RuntimeError::AssetUnavailable("invalid asset Content-Length".to_owned())
            })?;
        if !transformer_viz_worker::asset_policy::bounded_asset_size(declared, maximum, None) {
            return Err(RuntimeError::AssetUnavailable(
                "asset Content-Length violates fixed bounds".to_owned(),
            ));
        }
        let body = response.body().ok_or_else(|| {
            RuntimeError::AssetUnavailable("asset response has no body".to_owned())
        })?;
        let reader = body.get_reader();
        let read = js_sys::Reflect::get(&reader, &JsValue::from_str("read"))
            .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))?
            .dyn_into::<js_sys::Function>()
            .map_err(|_| RuntimeError::AssetUnavailable("asset stream has no reader".to_owned()))?;
        let mut bytes = Vec::new();
        loop {
            let promise = read
                .call0(&reader)
                .map(js_sys::Promise::from)
                .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))?;
            let chunk = wasm_bindgen_futures::JsFuture::from(promise)
                .await
                .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))?;
            let done = js_sys::Reflect::get(&chunk, &JsValue::from_str("done"))
                .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))?
                .as_bool()
                .ok_or_else(|| {
                    RuntimeError::AssetUnavailable("invalid asset stream state".to_owned())
                })?;
            if done {
                break;
            }
            let value = js_sys::Reflect::get(&chunk, &JsValue::from_str("value"))
                .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))?;
            let chunk = js_sys::Uint8Array::new(&value);
            let next_size = u64::try_from(bytes.len())
                .ok()
                .and_then(|size| size.checked_add(u64::from(chunk.length())))
                .ok_or_else(|| {
                    RuntimeError::AssetUnavailable("asset allocation overflow".to_owned())
                })?;
            if !transformer_viz_worker::asset_policy::bounded_asset_size(next_size, maximum, None) {
                return Err(RuntimeError::AssetUnavailable(
                    "asset stream exceeds fixed bounds".to_owned(),
                ));
            }
            let start = bytes.len();
            bytes.resize(
                usize::try_from(next_size).map_err(|_| {
                    RuntimeError::AssetUnavailable("asset allocation exceeds usize".to_owned())
                })?,
                0,
            );
            chunk.copy_to(&mut bytes[start..]);
        }
        let actual = u64::try_from(bytes.len()).map_err(|_| {
            RuntimeError::AssetUnavailable("asset allocation exceeds u64".to_owned())
        })?;
        if !transformer_viz_worker::asset_policy::bounded_asset_size(actual, maximum, exact_size) {
            return Err(RuntimeError::AssetUnavailable(
                "downloaded asset size violates manifest bounds".to_owned(),
            ));
        }
        Ok(bytes)
    })
}

fn verify_manifest_identity(bytes: &[u8]) -> Result<(), RuntimeError> {
    use sha2::{Digest as _, Sha256};

    let actual = format!("{:x}", Sha256::digest(bytes));
    if actual != EXPECTED_MANIFEST_SHA256 {
        return Err(RuntimeError::ChecksumMismatch {
            expected: EXPECTED_MANIFEST_SHA256.to_owned(),
            actual,
        });
    }
    Ok(())
}
