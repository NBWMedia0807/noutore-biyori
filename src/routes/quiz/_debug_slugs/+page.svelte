<script> export let data; </script>

<h1>Sanity slugs (latest 100)</h1>
<ol>
  {#each data.rows as r}
    <li>
      <code>{r._type}</code> — {r.title} — <strong>{r.slug}</strong>
      &nbsp;<a href={`/quiz/${r.slug}`} target="_blank">open</a>
    </li>
  {/each}
</ol>