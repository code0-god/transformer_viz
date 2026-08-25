//! Curriculum tokenizer fixture contracts.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use nanogpt_schema::{TokenId, TokenKind};
use nanogpt_tokenizer::Tokenizer;

fn repository_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn canonical_tokenizer() -> Result<Tokenizer, Box<dyn std::error::Error>> {
    let path = repository_root().join("apps/web/public/models/edu/tokenizer.json");
    Ok(Tokenizer::from_json(&fs::read_to_string(path)?)?)
}

fn export_to(path: &Path) -> Result<std::process::Output, Box<dyn std::error::Error>> {
    let asset = repository_root().join("apps/web/public/models/edu/tokenizer.json");
    Ok(
        Command::new(env!("CARGO_BIN_EXE_export_curriculum_examples"))
            .arg(asset)
            .arg(path)
            .output()?,
    )
}

#[test]
fn generated_fixture_is_present_and_fresh() -> Result<(), Box<dyn std::error::Error>> {
    // Given: the canonical tokenizer and committed generated fixture.
    let root = repository_root();
    let generated = root.join(
        "apps/web/src/tracks/decoder-only-fundamentals/curriculum/generated/tokenExamples.ts",
    );
    let temporary = std::env::temp_dir().join(format!(
        "curriculum-token-examples-{}.ts",
        std::process::id()
    ));
    // When: the Rust exporter regenerates the fixture.
    let output = export_to(&temporary)?;
    // Then: export succeeds and bytes match the committed artifact.
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(fs::read(&temporary)?, fs::read(generated)?);
    fs::remove_file(temporary)?;
    Ok(())
}

#[test]
fn exact_examples_have_display_and_generation_boundaries() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: exact curriculum source examples.
    let tokenizer = canonical_tokenizer()?;
    // When: display and generation encodings are produced.
    let cases = [
        ("the-cat", "the cat"),
        ("the-cats", "the cats"),
        ("korean-han", "한"),
    ];
    // Then: display has BOS/EOS while generation has BOS and no EOS.
    for (id, text) in cases {
        let display = tokenizer.encode(text);
        let prefix = tokenizer.generation_prompt(text)?;
        assert_eq!(
            display.tokens.first().map(|token| token.kind),
            Some(TokenKind::Bos),
            "{id}"
        );
        assert_eq!(
            display.tokens.last().map(|token| token.kind),
            Some(TokenKind::Eos),
            "{id}"
        );
        assert_eq!(
            prefix.tokens.first().map(|token| token.kind),
            Some(TokenKind::Bos),
            "{id}"
        );
        assert_ne!(
            prefix.tokens.last().map(|token| token.kind),
            Some(TokenKind::Eos),
            "{id}"
        );
        assert_eq!(tokenizer.decode(&display.tokens)?, text, "{id}");
        assert_eq!(tokenizer.decode(&prefix.tokens)?, text, "{id}");
    }
    Ok(())
}

#[test]
fn korean_han_is_exactly_three_utf8_byte_tokens() -> Result<(), Box<dyn std::error::Error>> {
    // Given: one Korean scalar and the canonical byte tokenizer.
    let tokenizer = canonical_tokenizer()?;
    // When: display encoding is inspected without boundary tokens.
    let encoded = tokenizer.encode("한");
    let bytes: Vec<_> = encoded
        .tokens
        .iter()
        .filter(|token| token.kind == TokenKind::Byte)
        .collect();
    // Then: UTF-8 contributes exactly three byte tokens and round-trips.
    assert_eq!(bytes.len(), 3);
    assert_eq!(
        bytes.iter().map(|token| token.piece[0]).collect::<Vec<_>>(),
        "한".as_bytes()
    );
    assert_eq!(tokenizer.decode(&encoded.tokens)?, "한");
    Ok(())
}

#[test]
fn canonical_special_ids_and_byte_offset_semantics_are_preserved()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: the canonical tokenizer configuration.
    let tokenizer = canonical_tokenizer()?;
    let config = tokenizer.config();
    // When: reserved and byte IDs are inspected.
    let byte = tokenizer.token_info(TokenId(config.byte_offset + u32::from(b'A')))?;
    // Then: BOS/EOS/UNK remain reserved and byte IDs begin at byte_offset.
    assert_eq!(
        (
            config.bos_id,
            config.eos_id,
            config.unk_id,
            config.byte_offset
        ),
        (TokenId(0), TokenId(1), TokenId(2), 3)
    );
    assert_eq!((byte.kind, byte.piece), (TokenKind::Byte, vec![b'A']));
    Ok(())
}
