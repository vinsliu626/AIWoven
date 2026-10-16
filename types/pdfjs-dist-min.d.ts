// The minified legacy build has the same API as pdf.mjs but ships no typings of its own.
// It is used because webpack cannot evaluate the unminified pdf.mjs (its top-level
// `var __webpack_exports__` shadows webpack's module argument and the module throws
// "Object.defineProperty called on non-object" before any PDF is opened).
declare module "pdfjs-dist/legacy/build/pdf.min.mjs" {
  export * from "pdfjs-dist/legacy/build/pdf.mjs";
}
