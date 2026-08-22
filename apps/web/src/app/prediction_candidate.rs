//! Pure projection of one authoritative prediction candidate.

use nanogpt_schema::LogitCandidate;

/// Raw-logit values prepared for one prediction candidate row.
#[derive(Debug, PartialEq)]
pub struct PredictionCandidateProjection {
    /// Authoritative raw logit widened exactly from the schema value.
    pub raw_value: f64,
    /// Signed, fixed-precision text shown to the user.
    pub display_text: String,
}

impl PredictionCandidateProjection {
    /// Returns an exact round-trippable DOM data attribute.
    #[must_use]
    pub fn data_attribute(&self) -> String {
        format!("{:.16e}", self.raw_value)
    }
}

/// Projects one candidate without consulting or formatting its probability.
#[must_use]
pub fn project_logit_candidate(candidate: &LogitCandidate) -> PredictionCandidateProjection {
    let raw_value = f64::from(candidate.logit.get());
    PredictionCandidateProjection {
        raw_value,
        display_text: format!("{raw_value:+.7}"),
    }
}
