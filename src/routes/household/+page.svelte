<script lang="ts">
    export let data;
    export let form;

    let adults = form?.adults ?? data.adults;
    let children = form?.children ?? data.children;

    // Barnens födelsedatum (array)
    let childBirthdates = form?.childBirthdates ?? data.childBirthdates;

    // Om antal barn ändras – justera arrayen
    $: {
        if (children > childBirthdates.length) {
            while (childBirthdates.length < children) {
                childBirthdates.push({ birthdate: "" });
            }
        } else if (children < childBirthdates.length) {
            childBirthdates = childBirthdates.slice(0, children);
        }
    }

    let message = form?.message ?? "";
</script>

<h1>Hushållsinställningar</h1>

{#if !data.householdId}
    <p>Du tillhör inget hushåll.</p>
{:else}
    <p><strong>Hushålls‑ID:</strong></p>
    <pre>{data.householdId}</pre>

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
{/if}

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
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
    }

    label {
        font-weight: 600;
        color: #374151;
    }

    input[type="number"],
    input[type="date"] {
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
