use nanogpt_schema::TensorSnapshot;

use super::{TensorAddress, TensorAddressError, TensorAxis, bounds, clamp, overflow, require_rank};

impl<'a> TensorAddress<'a> {
    /// Resolves one feature in a rank-one vector.
    ///
    /// # Errors
    /// Returns a typed rank, shape/value, or address error for malformed data.
    pub fn vector(
        tensor: &'a TensorSnapshot,
        feature: usize,
        radius: usize,
    ) -> Result<Self, TensorAddressError> {
        let [features] = require_rank::<1>(tensor)?;
        let feature = clamp(feature, features, tensor)?;
        Self::resolve(
            tensor,
            vec![TensorAxis {
                name: "feature",
                index: feature,
            }],
            0,
            features,
            feature,
            radius,
        )
    }

    /// Resolves one token/feature value in a `[B,T,C]` tensor at batch zero.
    ///
    /// # Errors
    /// Returns a typed rank, shape/value, or selector error for malformed data.
    pub fn token_feature(
        tensor: &'a TensorSnapshot,
        token: usize,
        feature: usize,
        radius: usize,
    ) -> Result<Self, TensorAddressError> {
        let [batches, tokens, features] = require_rank::<3>(tensor)?;
        if batches == 0 || token >= tokens {
            return Err(bounds(tensor));
        }
        let feature = clamp(feature, features, tensor)?;
        let row_start = token
            .checked_mul(features)
            .ok_or_else(|| overflow(tensor))?;
        Self::resolve(
            tensor,
            vec![
                TensorAxis {
                    name: "batch",
                    index: 0,
                },
                TensorAxis {
                    name: "token",
                    index: token,
                },
                TensorAxis {
                    name: "feature",
                    index: feature,
                },
            ],
            row_start,
            features,
            feature,
            radius,
        )
    }

    /// Resolves one feature in captured selected-head `[1,1,T,D]` data.
    ///
    /// # Errors
    /// Returns a typed rank, shape/value, or selector error for malformed data.
    pub fn head_token_feature(
        tensor: &'a TensorSnapshot,
        token: usize,
        feature: usize,
        radius: usize,
    ) -> Result<Self, TensorAddressError> {
        let [batches, heads, tokens, features] = require_rank::<4>(tensor)?;
        if batches != 1 || heads != 1 || token >= tokens {
            return Err(bounds(tensor));
        }
        let feature = clamp(feature, features, tensor)?;
        let row_start = token
            .checked_mul(features)
            .ok_or_else(|| overflow(tensor))?;
        Self::resolve(
            tensor,
            vec![
                TensorAxis {
                    name: "batch",
                    index: 0,
                },
                TensorAxis {
                    name: "head",
                    index: 0,
                },
                TensorAxis {
                    name: "token",
                    index: token,
                },
                TensorAxis {
                    name: "feature",
                    index: feature,
                },
            ],
            row_start,
            features,
            feature,
            radius,
        )
    }

    /// Resolves one query/key cell and a bounded row from `[1,1,T,T]` data.
    ///
    /// # Errors
    /// Returns a typed rank, shape/value, or selector error for malformed data.
    pub fn matrix_cell(
        tensor: &'a TensorSnapshot,
        query: usize,
        key: usize,
        radius: usize,
    ) -> Result<Self, TensorAddressError> {
        let [batches, heads, rows, columns] = require_rank::<4>(tensor)?;
        if batches != 1 || heads != 1 || query >= rows || key >= columns {
            return Err(bounds(tensor));
        }
        let row_start = query.checked_mul(columns).ok_or_else(|| overflow(tensor))?;
        Self::resolve(
            tensor,
            vec![
                TensorAxis {
                    name: "batch",
                    index: 0,
                },
                TensorAxis {
                    name: "head",
                    index: 0,
                },
                TensorAxis {
                    name: "query",
                    index: query,
                },
                TensorAxis {
                    name: "key",
                    index: key,
                },
            ],
            row_start,
            columns,
            key,
            radius,
        )
    }
}
