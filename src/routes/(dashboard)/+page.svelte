<script lang="ts">
    export let data;
</script>

<h1>Välkommen {data.user.email}</h1>

<p>Välj en sektion för att fortsätta:</p>

<div class="grid">
    <a class="card" href="/budget">
        <h2>Ekonomi</h2>
        <p>Budget, utgifter, abonnemang, sparande…</p>
    </a>

    <a class="card" href="/familjestart">
        <h2>Familjeplanering</h2>
        <p>Schema, aktiviteter, planering…</p>
    </a>

    <a class="card" href="/settings">
        <h2>Inställningar</h2>
        <p>Profil, hushåll, behörigheter…</p>
    </a>
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    p {
        margin-bottom: 1.5rem;
        color: #374151;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .card {
        display: block;
        padding: 1.5rem;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        text-decoration: none;
        color: inherit;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
    }

    .card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    h2 {
        margin-top: 0;
        font-size: 1.2rem;
        color: #111827;
    }
</style>
