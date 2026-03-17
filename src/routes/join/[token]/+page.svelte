<script lang="ts">
    export let data;
</script>

<h1>Går med i hushåll…</h1>

<div class="section">
    {#if data.error}
        <p class="error">{data.error}</p>
    {:else}
        <p>Du läggs till i hushållet. Vänta ett ögonblick…</p>
    {/if}
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .section {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        padding: 1.5rem;
        max-width: 420px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .error {
        color: #dc2626;
        font-size: 0.95rem;
    }
</style>
