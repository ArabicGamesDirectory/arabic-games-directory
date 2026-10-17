// Serializes a JSON-LD object for a `<script type="application/ld+json">`
// rendered with dangerouslySetInnerHTML.
//
// Plain JSON.stringify is NOT safe there: it leaves `</script>` intact, so a
// game name or description containing it would end the script element and let
// the rest run as HTML — stored XSS from a public submission. Escaping `<`, `>`
// and `&` as \u-sequences keeps the JSON identical once parsed, while the HTML
// parser never sees a tag or entity.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
