<script lang="ts">
  export let monthName = "Oktober";
  export let calendarMonth = "Oktober";

  // Dessa kommer senare från databasen
  export let incomes = {
    arbete: 0,
    akassa: 0,
    forsorjningsstod: 0,
    barnbidrag: 0,
    bostadsbidrag: 0,
    underhallsbidrag: 0,
    fp: 0,
    vab: 0,
    sjukersattning: 0,
    ovriga: 0,
    overskott: 0,
    korrigering: 0
  };

  export let expenses = {
    hyra: 0,
    el: 0,
    hemforsakring: 0,
    matVuxen: 0,
    matBarn: 0,
    ovrigtBarn: 0,
    internet: 0,

    facket: 0,
    akassa: 0,

    barnomsorg: 0,
    samhallsavgifter: 0,
    sjukhus: 0,
    mediciner: 0,

    korrigering: 0
  };

  // Summeringar
  $: totalIncome =
    incomes.arbete +
    incomes.akassa +
    incomes.forsorjningsstod +
    incomes.barnbidrag +
    incomes.bostadsbidrag +
    incomes.underhallsbidrag +
    incomes.fp +
    incomes.vab +
    incomes.sjukersattning +
    incomes.ovriga +
    incomes.overskott +
    incomes.korrigering;

  $: totalExpenses =
    expenses.hyra +
    expenses.el +
    expenses.hemforsakring +
    expenses.matVuxen +
    expenses.matBarn +
    expenses.ovrigtBarn +
    expenses.internet +
    expenses.facket +
    expenses.akassa +
    expenses.barnomsorg +
    expenses.samhallsavgifter +
    expenses.sjukhus +
    expenses.mediciner +
    expenses.korrigering;

  $: balance = totalIncome - totalExpenses;
</script>

<div class="budget-container">
  <!-- Översta sammanfattningen -->
  <table class="summary">
    <tr>
      <th>In</th>
      <th>Ut</th>
      <th>Balans</th>
      <th>Biståndsmånad</th>
      <th>Kalendermånad</th>
    </tr>
    <tr>
      <td class="green">{totalIncome} kr</td>
      <td class="red">{totalExpenses} kr</td>
      <td class={balance >= 0 ? "green" : "red"}>{balance} kr</td>
      <td>{monthName}</td>
      <td>{calendarMonth}</td>
    </tr>
  </table>

  <!-- Inkomster -->
  <h3>Inkomster</h3>
  <table>
    <tr><td>Arbete</td><td>{incomes.arbete} kr</td></tr>
    <tr><td>A‑kassa</td><td>{incomes.akassa} kr</td></tr>
    <tr><td>Försörjningsstöd</td><td>{incomes.forsorjningsstod} kr</td></tr>
    <tr><td>Barnbidrag</td><td>{incomes.barnbidrag} kr</td></tr>
    <tr><td>Bostadsbidrag</td><td>{incomes.bostadsbidrag} kr</td></tr>
    <tr><td>Underhållsbidrag</td><td>{incomes.underhallsbidrag} kr</td></tr>
    <tr><td>Dagersättning (FP)</td><td>{incomes.fp} kr</td></tr>
    <tr><td>Dagersättning (VAB)</td><td>{incomes.vab} kr</td></tr>
    <tr><td>Sjukersättning</td><td>{incomes.sjukersattning} kr</td></tr>
    <tr><td>Övriga insättningar</td><td>{incomes.ovriga} kr</td></tr>
    <tr><td>Överskridande överskott</td><td>{incomes.overskott} kr</td></tr>

    <!-- Korrigeringsrad -->
    <tr class="correction">
      <td>Korrigering (inkomst)</td>
      <td>{incomes.korrigering} kr</td>
    </tr>

    <tr class="sum">
      <td><strong>Summa inkomst</strong></td>
      <td><strong>{totalIncome} kr</strong></td>
    </tr>
  </table>

  <!-- Utgifter -->
  <h3>Utgifter</h3>

  <h4>Hem</h4>
  <table>
    <tr><td>Hyra</td><td>{expenses.hyra} kr</td></tr>
    <tr><td>El</td><td>{expenses.el} kr</td></tr>
    <tr><td>Hemförsäkring</td><td>{expenses.hemforsakring} kr</td></tr>
    <tr><td>Mat vuxen</td><td>{expenses.matVuxen} kr</td></tr>
    <tr><td>Mat barn</td><td>{expenses.matBarn} kr</td></tr>
    <tr><td>Övriga kostnad barn</td><td>{expenses.ovrigtBarn} kr</td></tr>
    <tr><td>Internet</td><td>{expenses.internet} kr</td></tr>
  </table>

  <h4>Arbete</h4>
  <table>
    <tr><td>Facket</td><td>{expenses.facket} kr</td></tr>
    <tr><td>A‑kassa</td><td>{expenses.akassa} kr</td></tr>
  </table>

  <h4>Samhäll</h4>
  <table>
    <tr><td>Barnomsorg</td><td>{expenses.barnomsorg} kr</td></tr>
    <tr><td>Samhäll</td><td>{expenses.samhallsavgifter} kr</td></tr>
    <tr><td>Sjukhuskostnader</td><td>{expenses.sjukhus} kr</td></tr>
    <tr><td>Mediciner</td><td>{expenses.mediciner} kr</td></tr>

    <!-- Korrigeringsrad -->
    <tr class="correction">
      <td>Korrigering (utgift)</td>
      <td>{expenses.korrigering} kr</td>
    </tr>

    <tr class="sum">
      <td><strong>Summa utgifter</strong></td>
      <td><strong>{totalExpenses} kr</strong></td>
    </tr>
  </table>
</div>

<style>
  .budget-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td, th {
    padding: 6px 4px;
    border-bottom: 1px solid #ddd;
  }

  .green { color: #0a7a0a; font-weight: 600; }
  .red { color: #b30000; font-weight: 600; }

  .sum td {
    background: #f0f0f0;
    font-weight: bold;
  }

  .correction td {
    background: #fff7d6;
  }

  h3 {
    margin-top: 12px;
    margin-bottom: 4px;
  }

  h4 {
    margin-top: 16px;
    margin-bottom: 4px;
    font-size: 15px;
    color: #444;
  }
</style>
