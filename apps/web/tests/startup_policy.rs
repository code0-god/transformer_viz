//! Development startup policy contracts.

#[test]
fn development_template_does_not_block_trunk_bootstrap() {
    // Given: the HTML template consumed directly by `trunk serve`.
    let source = include_str!("../index.html");

    // When: Trunk injects its dynamic inline app and live-reload bootstraps.
    let defines_content_security_policy = source
        .to_ascii_lowercase()
        .contains("content-security-policy");

    // Then: release-only CSP must not block those generated scripts.
    assert!(
        !defines_content_security_policy,
        "development template CSP blocks Trunk inline bootstrap"
    );
}
