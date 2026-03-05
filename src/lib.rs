#![deny(clippy::all)]

use std::sync::{Arc, Mutex};

use marukov::chain::Chain;
use marukov::Vocab;
use marukov::{Text, TextOptions as MarukovTextOptions};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use rayon::prelude::*;

#[ctor::ctor]
fn init_panic_hook() {
    std::panic::set_hook(Box::new(|_| {}));
}

#[napi(object)]
pub struct TextOptions {
    pub tries: Option<i32>,
    pub min_words: Option<i32>,
    pub max_words: Option<i32>,
}

fn merge_options(js: Option<TextOptions>) -> MarukovTextOptions {
    let defaults = MarukovTextOptions::default();
    match js {
        None => defaults,
        Some(o) => MarukovTextOptions {
            tries: o.tries.unwrap_or(defaults.tries),
            min_words: o.min_words.unwrap_or(defaults.min_words),
            max_words: o.max_words.unwrap_or(defaults.max_words),
            init_state: None,
        },
    }
}

pub struct GenerateTask {
    text: Arc<Text>,
    options: MarukovTextOptions,
}

impl Task for GenerateTask {
    type Output = Option<String>;
    type JsValue = Option<String>;

    fn compute(&mut self) -> Result<Self::Output> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.text.generate(self.options.clone())
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

pub struct GenerateWithStartTask {
    text: Arc<Text>,
    start: String,
    options: MarukovTextOptions,
}

impl Task for GenerateWithStartTask {
    type Output = Option<String>;
    type JsValue = Option<String>;

    fn compute(&mut self) -> Result<Self::Output> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.text.generate_with_start(&self.start, self.options.clone())
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

pub struct GenerateManyTask {
    text: Arc<Text>,
    count: u32,
    options: MarukovTextOptions,
}

impl Task for GenerateManyTask {
    type Output = Vec<String>;
    type JsValue = Vec<String>;

    fn compute(&mut self) -> Result<Self::Output> {
        let text = Arc::clone(&self.text);
        let opts = self.options.clone();
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
            (0..self.count)
                .into_par_iter()
                .filter_map(|_| text.generate(opts.clone()))
                .collect()
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub struct MarkovText(Arc<Text>);

#[napi]
impl MarkovText {
    #[napi(constructor)]
    pub fn new(data: String) -> Self {
        Self(Arc::new(Text::new(data)))
    }

    #[napi]
    pub fn generate(&self, options: Option<TextOptions>) -> Result<Option<String>> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.0.generate(merge_options(options))
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    #[napi]
    pub fn generate_async(&self, options: Option<TextOptions>) -> AsyncTask<GenerateTask> {
        AsyncTask::new(GenerateTask {
            text: Arc::clone(&self.0),
            options: merge_options(options),
        })
    }

    #[napi]
    pub fn generate_with_start(
        &self,
        start: String,
        options: Option<TextOptions>,
    ) -> Result<Option<String>> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.0.generate_with_start(&start, merge_options(options))
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    #[napi]
    pub fn generate_with_start_async(
        &self,
        start: String,
        options: Option<TextOptions>,
    ) -> AsyncTask<GenerateWithStartTask> {
        AsyncTask::new(GenerateWithStartTask {
            text: Arc::clone(&self.0),
            start,
            options: merge_options(options),
        })
    }

    #[napi]
    pub fn generate_with_starts(
        &self,
        starts: Vec<String>,
        options: Option<TextOptions>,
    ) -> Result<Option<String>> {
        let opts = merge_options(options);
        for start in &starts {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                self.0.generate_with_start(start, opts.clone())
            }))
            .map_err(|_| {
                Error::new(Status::GenericFailure, "Generation failed: corpus may be empty")
            })?;
            if result.is_some() {
                return Ok(result);
            }
        }
        Ok(None)
    }

    #[napi]
    pub fn generate_many(&self, count: u32, options: Option<TextOptions>) -> Result<Vec<String>> {
        let text = Arc::clone(&self.0);
        let opts = merge_options(options);
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
            (0..count)
                .into_par_iter()
                .filter_map(|_| text.generate(opts.clone()))
                .collect()
        }))
        .map_err(|_| Error::new(Status::GenericFailure, "Generation failed: corpus may be empty"))
    }

    #[napi]
    pub fn generate_many_async(
        &self,
        count: u32,
        options: Option<TextOptions>,
    ) -> AsyncTask<GenerateManyTask> {
        AsyncTask::new(GenerateManyTask {
            text: Arc::clone(&self.0),
            count,
            options: merge_options(options),
        })
    }
}

#[napi]
pub struct MarkovVocab(Mutex<Vocab>);

#[napi]
impl MarkovVocab {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self(Mutex::new(Vocab::new()))
    }

    #[napi]
    pub fn to_token(&self, word: String) -> u32 {
        self.0.lock().unwrap().to_token(&word)
    }

    #[napi]
    pub fn to_token_opt(&self, word: String) -> Option<u32> {
        self.0.lock().unwrap().to_token_opt(&word)
    }

    #[napi]
    pub fn to_word(&self, token: u32) -> String {
        self.0.lock().unwrap().to_word(token).to_string()
    }
}

#[napi]
pub struct StringChain(Chain<String>);

#[napi]
impl StringChain {
    #[napi(factory)]
    pub fn create_empty(begin: String, end: String) -> Self {
        Self(Chain::default(begin, end))
    }

    #[napi(factory)]
    pub fn from_data(data: Vec<Vec<String>>, begin: String, end: String) -> Self {
        Self(Chain::new(&data, begin, end))
    }

    #[napi]
    pub fn next(&self, state: Vec<String>) -> Result<String> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| self.0.next(&state)))
            .map_err(|_| {
                Error::new(Status::GenericFailure, "No transitions found for the given state")
            })
    }

    #[napi]
    pub fn generate(&self, init_state: Option<Vec<String>>) -> Result<Vec<String>> {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| self.0.generate(init_state)))
            .map_err(|_| {
                Error::new(
                    Status::GenericFailure,
                    "Chain is empty or init state has no transitions",
                )
            })
    }

    #[napi]
    pub fn find_init_states(&self, start: String) -> Vec<Vec<String>> {
        self.0.find_init_states(start).unwrap_or_default()
    }
}
