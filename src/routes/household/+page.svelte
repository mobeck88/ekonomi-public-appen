<script lang="ts">
    export let data;
    export let form;

    let adults = data.adults;
    let children = data.children;
    let childBirthdates = data.childBirthdates.map((c: { birthdate: string }) => ({
        birthdate: c.birthdate
    }));

    if (form?.adults !== undefined) adults = form.adults;
    if (form?.children !== undefined) children = form.children;
    if (form?.childBirthdates !== undefined) childBirthdates = form.childBirthdates;

    $: {
        if (children > childBirthdates.length) {
            while (childBirthdates.length < children) {
                childBirthdates.push({ birthdate: '' });
            }
        } else if (children < childBirthdates.length) {
            childBirthdates = childBirthdates.slice(0, children);
        }
    }

    let message = form?.message ?? '';
</script>

<h1>Hushåll</h1>

{#if data.householdId}
    <p><strong>Ditt hushålls‑ID:</strong></p>
    <pre>{data.householdId}</pre>
    <p>Din roll: {data.role}</p>

    <!-- ⭐ NYTT: Visa hushållskoden direkt -->
    <h2>Hushållskod</h2>
    {#if data.join_code}
        <p>Ge denna kod till din partner:</p>
        <pre>{data.join_code}</pre>
    {:else}
        <p>Ingen hushållskod genererad ännu.</p>
    {/if}

    <!-- ⭐ NYTT: Generera ny hushållskod -->
    <form method="POST" action="?/generateInvite" style="margin-top: 10px">
        <button>Generera ny hushållskod</button>
    </form>

    {#if form?.join_code}
        <p>Ny kod skapad:</p>
        <pre>{form.join_code}</pre>
    {/if}

    <h2>Hushållsinställningar</h2>

    <form method="POST" action="?/saveHousehold" class="form">

        <label for="adults">Antal vuxna</label>
        <input id="adults" name="adults" type="number" min="0" bind:value={adults} />

        <label for="children">Antal barn</label>
        <input id="children" name="children" type="number" min="0" bind:value={children} />

        {#if children > 0}
            <h3>Barnens födelsedatum</h3>

            {#each Array(children) as _, i}
                <div>
                    <label for="child_{i}_birthdate">Barn {i + 1}</label>
                    <input
                        id="child_{i}_birthdate"
                        name="child_{i}_birthdate"
                        type="date"
                        bind:value={childBirthdates[i].birthdate}
                    />
                </div>
            {/each}
        {/if}

        <button type="submit">Spara hushåll</button>

        {#if message}
            <p class="feedback">{message}</p>
        {/if}
    </form>

    <h2>Byt hushåll</h2>
    <form method="POST" action="?/leaveHousehold">
        <button>Byt hushåll</button>
    </form>

    <h2>Ta bort hushåll</h2>
    <form method="POST" action="?/deleteHousehold">
        <button style="background:red">Ta bort hushåll</button>
    </form>

{:else}
    <p>Du tillhör inget hushåll ännu.</p>

    <h2>Gå med i ett hushåll</h2>
    <form method="POST" action="?/join">
        <label for="code">Hushållskod</label>
        <input id="code" name="code" type="text" required />

        {#if form?.error}
            <p style="color:red; margin-top:10px">{form.error}</p>
        {/if}

        {#if form?.success}
            <p style="color:green; margin-top:10px">Du har gått med i hushållet.</p>
        {/if}

        <button type="submit" style="margin-top:10px">Gå med</button>
    </form>
{/if}

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    h2 {
        margin-top: 1.5rem;
        font-size: 1.3rem;
        color: #1f2937;
    }

    .form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        margin-top: 1rem;
    }

    label {
        font-weight: 600;
        color: #374151;
    }

    input[type='number'],
    input[type='date'],
    input[type='text'] {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
        background: #ffffff;
    }

    button {
        padding: 0.75rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.15s;
    }

    button:hover {
        background: #1d4ed8;
    }

    .feedback {
        margin-top: 1rem;
        color: green;
        font-weight: 600;
    }
</style>
