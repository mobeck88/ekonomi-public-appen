<script>
    export let data;
    let isMember = data.isMemberOfChurch;
    let message = "";
</script>

<h1>Inställningar</h1>

<section>
    <h2>Kyrkotillhörighet</h2>

    <form method="POST">
        <label>
            <input type="checkbox" name="isMember" bind:checked={isMember}>
            Jag är medlem i Svenska kyrkan
        </label>

        <button type="submit" name="action" value="updateChurch">
            Spara
        </button>
    </form>
</section>

<section style="margin-top: 40px;">
    <h2>Byt lösenord</h2>

    <form method="POST">
        <input type="password" name="newPassword" placeholder="Nytt lösenord" required>
        <button type="submit" name="action" value="changePassword">
            Byt lösenord
        </button>
    </form>
</section>

{#if data.message}
    <p style="margin-top:20px; color: green;">{data.message}</p>
{/if}