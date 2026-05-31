// Generic JSON-LD renderer for schema types not covered by SchemaMarkup's
// typed union (e.g. WebSite, BreadcrumbList, SearchAction).
// Safety: schema is always constructed in server code from constant values,
// never from raw user input. JSON.stringify escapes < > & inside <script>.

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>
}

export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
