<script>
  export let data;
  const { doc } = data; // serverと一致
</script>

<svelte:head><title>{doc.title}</title></svelte:head>

<main style="max-width:800px;margin:24px auto;padding:16px;">
  <h1>{doc.title}</h1>
  {#if doc.mainImage?.asset?.url}
    <img src={doc.mainImage.asset.url} alt={doc.title} style="max-width:100%;height:auto;border-radius:12px;" />
  {/if}
  <p>slug: <code>{doc.slug}</code></p>

  <details style="margin-top:16px;">
    <summary>Raw JSON</summary>
    <pre>{JSON.stringify(doc, null, 2)}</pre>
  </details>
</main>
