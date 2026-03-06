<script>
  export let data;

  let income = data.income;
  let year = data.year;

  function update() {
    const params = new URLSearchParams({ income, year });
    window.location.search = params.toString();
  }
</script>

<h1>Skattetabell</h1>

<div>
  <label>År</label>
  <input type="number" bind:value={year} min="2020" max="2030" />

  <label>Månadslön</label>
  <input type="number" bind:value={income} />

  <button on:click={update}>Beräkna</button>
</div>

{#if data.income > 0}
  <h2>Resultat</h2>

  <p>Skatt arbete (tabell): {data.tableTax ?? 'Ingen rad matchad'}</p>
  <p>Skatt assistans (30%): {data.assistansTax}</p>
  <p>Skatt FK: {data.fkTax}</p>
{/if}
