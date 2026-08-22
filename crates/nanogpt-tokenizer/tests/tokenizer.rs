//! Phase C deterministic educational tokenizer contracts.

use nanogpt_schema::{TokenId, TokenKind, TokenizerConfig};
use nanogpt_tokenizer::Tokenizer;

fn tokenizer(max_length: usize) -> Result<Tokenizer, Box<dyn std::error::Error>> {
    let json = format!(
        r#"{{"kind":"byte_fallback_v1","bos_id":0,"eos_id":1,"unk_id":2,"byte_offset":3,"max_length":{max_length}}}"#
    );
    Ok(Tokenizer::from_json(&json)?)
}

#[test]
fn token_ids_repeat_when_input_is_identical() -> Result<(), Box<dyn std::error::Error>> {
    // Given: one configuration and input.
    let tokenizer = tokenizer(24)?;
    // When: text is encoded twice.
    let first = tokenizer.encode("the cat");
    let second = tokenizer.encode("the cat");
    // Then: IDs and pieces are deterministic.
    assert_eq!(first, second);
    Ok(())
}

#[test]
fn text_round_trips_when_utf8_contains_multiple_byte_widths()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: arbitrary valid UTF-8.
    let tokenizer = tokenizer(64)?;
    let text = "한글 café 🦀";
    // When: it is encoded and decoded.
    let decoded = tokenizer.decode(&tokenizer.encode(text).tokens)?;
    // Then: the original survives exactly.
    assert_eq!(decoded, text);
    Ok(())
}

#[test]
fn whitespace_and_punctuation_keep_original_pieces() -> Result<(), Box<dyn std::error::Error>> {
    // Given: visible teaching-sensitive characters.
    let tokenizer = tokenizer(24)?;
    // When: they are encoded.
    let encoded = tokenizer.encode(" a!\n");
    // Then: displays and source bytes remain clear.
    let pieces: Vec<_> = encoded
        .tokens
        .iter()
        .map(|token| token.display.as_str())
        .collect();
    assert_eq!(pieces, ["<BOS>", "␠", "a", "!", "\\n", "<EOS>"]);
    assert_eq!(tokenizer.decode(&encoded.tokens)?, " a!\n");
    Ok(())
}

#[test]
fn empty_text_contains_only_boundaries() -> Result<(), Box<dyn std::error::Error>> {
    // Given: empty text.
    let tokenizer = tokenizer(24)?;
    // When: it is encoded.
    let encoded = tokenizer.encode("");
    // Then: BOS/EOS define a valid sequence.
    assert_eq!(encoded.ids(), vec![TokenId(0), TokenId(1)]);
    assert_eq!(tokenizer.decode(&encoded.tokens)?, "");
    Ok(())
}

#[test]
fn excess_bytes_are_truncated_while_eos_is_preserved() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a five-token limit and longer input.
    let tokenizer = tokenizer(5)?;
    // When: six bytes are encoded.
    let encoded = tokenizer.encode("abcdef");
    // Then: three content slots and EOS are retained.
    assert!(encoded.truncated);
    assert_eq!(
        encoded.ids(),
        vec![
            TokenId(0),
            TokenId(100),
            TokenId(101),
            TokenId(102),
            TokenId(1)
        ]
    );
    assert_eq!(tokenizer.decode(&encoded.tokens)?, "abc");
    Ok(())
}

#[test]
fn byte_ids_match_python_reference_formula() -> Result<(), Box<dyn std::error::Error>> {
    // Given: Python's [BOS] + [byte + 3] + [EOS] formula.
    let tokenizer = tokenizer(24)?;
    // When: the reference prompt is encoded.
    let encoded = tokenizer.encode("the cat");
    // Then: Rust emits exact reference IDs.
    assert_eq!(
        encoded.ids(),
        vec![
            TokenId(0),
            TokenId(119),
            TokenId(107),
            TokenId(104),
            TokenId(35),
            TokenId(102),
            TokenId(100),
            TokenId(119),
            TokenId(1)
        ]
    );
    Ok(())
}

#[test]
fn truncation_stops_at_utf8_boundary_when_next_character_does_not_fit()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: one content-byte slot and a four-byte character.
    let tokenizer = tokenizer(3)?;
    // When: the character is encoded under that limit.
    let encoded = tokenizer.encode("🦀");
    // Then: truncation keeps a valid UTF-8 prefix rather than a partial scalar.
    assert!(encoded.truncated);
    assert_eq!(tokenizer.decode(&encoded.tokens)?, "");
    Ok(())
}

#[test]
fn tokenizer_byte_range_uses_checked_u32_arithmetic() {
    let accepted = TokenizerConfig {
        byte_offset: u32::MAX - u32::from(u8::MAX),
        ..TokenizerConfig::byte_fallback(4)
    };
    assert!(Tokenizer::new(accepted.clone()).is_ok());

    let rejected = TokenizerConfig {
        byte_offset: accepted.byte_offset + 1,
        ..accepted
    };
    assert!(Tokenizer::new(rejected).is_err());
}

#[test]
fn maximum_valid_byte_range_encodes_without_panicking_or_wrapping()
-> Result<(), Box<dyn std::error::Error>> {
    let tokenizer = Tokenizer::new(TokenizerConfig {
        byte_offset: u32::MAX - u32::from(u8::MAX),
        ..TokenizerConfig::byte_fallback(4)
    })?;
    let encoded = tokenizer.encode("\u{00ff}");
    assert_eq!(encoded.tokens[1].id, TokenId(u32::MAX - 60));
    assert!(
        encoded
            .tokens
            .iter()
            .all(|token| token.id.0 >= tokenizer.config().byte_offset
                || token.kind != TokenKind::Byte)
    );
    Ok(())
}

#[test]
fn tokenizer_configuration_round_trips_through_json() -> Result<(), Box<dyn std::error::Error>> {
    // Given: canonical compact configuration.
    let config = TokenizerConfig::byte_fallback(24);
    // When: it crosses the JSON asset boundary.
    let parsed = Tokenizer::from_json(&serde_json::to_string(&config)?)?;
    // Then: all configuration remains intact.
    assert_eq!(parsed.config(), &config);
    Ok(())
}

#[test]
fn generation_prompt_has_bos_and_prompt_bytes_without_eos() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: a prompt at the generation boundary.
    let tokenizer = tokenizer(24)?;
    // When: it is encoded as autoregressive context.
    let encoded = tokenizer.generation_prompt("cat")?;
    // Then: BOS and bytes are retained but encoder EOS is absent.
    assert_eq!(
        encoded.ids(),
        vec![TokenId(0), TokenId(102), TokenId(100), TokenId(119)]
    );
    assert!(!encoded.truncated);
    Ok(())
}

#[test]
fn token_info_describes_generated_special_and_byte_tokens() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: generated EOS and printable byte IDs.
    let tokenizer = tokenizer(24)?;
    // When: focused metadata is requested.
    let eos = tokenizer.token_info(TokenId(1))?;
    let byte = tokenizer.token_info(TokenId(100))?;
    // Then: display, pieces, and semantic kinds are reusable by generation summaries.
    assert_eq!((eos.display.as_str(), eos.kind), ("<EOS>", TokenKind::Eos));
    assert_eq!(
        (byte.display.as_str(), byte.piece, byte.kind),
        ("a", vec![b'a'], TokenKind::Byte)
    );
    Ok(())
}

#[test]
fn generation_prompt_rejects_empty_and_truncated_input() -> Result<(), Box<dyn std::error::Error>> {
    // Given: an empty prompt and one longer than the context after BOS.
    let tokenizer = tokenizer(5)?;
    // When: each crosses the focused generation boundary.
    let empty = tokenizer.generation_prompt("");
    let long = tokenizer.generation_prompt("abcde");
    // Then: neither silently becomes a generation context.
    assert!(empty.is_err());
    assert!(long.is_err());
    Ok(())
}
