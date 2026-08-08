//! Embeds the frontend from `dist/`. memory-serve compresses compressible
//! assets at build time (gzip-only via the fork's disabled `brotli` feature)
//! and generates the code consumed by `memory_serve::load!()`.

fn main() {
    memory_serve::load_directory("./dist");
}
