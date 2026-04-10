<script lang="ts">
    import "../checklistor.css";

    export let data;

    let newText = "";
    let newDescription = "";
    let newDeadline = "";

    // Roller som får godkänna
    const allowedRoles = ["owner", "member", "guardian"];

    const canApprove =
        allowedRoles.includes(data.role) ||
        data.checklist.created_by === data.user.id;

    const isLocked = data.checklist.approved === true;
</script>

<h1>{data.checklist.title}</h1>

<!-- Visa godkänd-info -->
{#if isLocked}
    <div class="approved-banner">
        ✔ Godkänd av {data.checklist.approved_by}
        <br />
        {new Date(data.checklist.approved_at).toLocaleString()}
    </div>
{/if}

<!-- Lägg till punkt -->
<div class="section">
    <div class="section-header">Lägg till punkt</div>

    <form method="POST" action="?/addItem" class="create-form">
        <input type="hidden" name="checklist_id" value={data.checklist.id} />

        <div>
            <label>Punkt</label>
            <input name="text" bind:value={newText} required disabled={isLocked} />
        </div>

        <div>
            <label>Beskrivning</label>
            <textarea
                name="description"
                bind:value={newDescription}
                disabled={isLocked}
            ></textarea>
        </div>

        <div>
            <label>Deadline</label>
            <input
                name="deadline"
                type="date"
                bind:value={newDeadline}
                disabled={isLocked}
            />
        </div>

        <button type="submit" disabled={isLocked}>Lägg till</button>
    </form>
</div>

<!-- Lista punkter -->
<div class="section">
    <div class="section-header">Checklistepunkter</div>

    {#if data.items.length === 0}
        <div class="empty">Inga punkter ännu.</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Klar</th>
                    <th>Punkt</th>
                    <th>Deadline</th>
                </tr>
            </thead>

            <tbody>
                {#each data.items as item}
                    <tr>
                        <td>
                            <form
                                method="POST"
                                action="?/toggleItem"
                                style="display:inline;"
                            >
                                <input type="hidden" name="item_id" value={item.id} />

                                <input
                                    type="checkbox"
                                    checked={item.done}
                                    disabled={isLocked}
                                    on:change={(e) => e.currentTarget.form?.submit()}
                                />
                            </form>
                        </td>

                        <td>{item.text}</td>
                        <td>{item.deadline || ""}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<!-- Godkänn lista -->
{#if !isLocked && data.items.length > 0 && data.items.every((i) => i.done) && canApprove}
    <form method="POST" action="?/approve">
        <input type="hidden" name="checklist_id" value={data.checklist.id} />
        <button>Godkänn lista</button>
    </form>
{/if}

