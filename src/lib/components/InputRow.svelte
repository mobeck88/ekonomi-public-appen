<script>
    export let label;
    export let value;
    export let type = "text";
    export let step = "1";
</script>

<div class="row">
    <label>{label}</label>
    <input type={type} step={step} bind:value />
</div>

<style>
    .row {
        display: flex;
        justify-content: space-between;
        margin: 0.4rem 0;
    }
    label {
        flex: 1;
        padding-right: 1rem;
    }
    input {
        flex: 1;
        padding: 0.4rem;
        font-size: 1rem;
    }
</style>
