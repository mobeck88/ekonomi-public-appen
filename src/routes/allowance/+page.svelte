<style>
    h1 {
        margin-bottom: 1rem;
        color: #1f2937;
    }

    /* Sektioner */
    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        background: #ffffff;
    }

    .section-header {
        width: 100%;
        background: #f8f9fb;
        border: none;
        padding: 1rem 1.2rem;
        font-size: 1.05rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        color: #1f2937;
    }

    .section-header:hover {
        background: #eef2f7;
    }

    .empty {
        padding: 1rem;
        color: #6b7280;
    }

    /* Cards */
    .card {
        border-top: 1px solid #e5e7eb;
        padding: 1rem;
        background: #ffffff;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 200px;
    }

    /* Formulär */
    .create-form {
        display: grid;
        gap: 0.8rem;
        padding: 1rem;
        max-width: 400px;
    }

    input, textarea {
        padding: 0.6rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
    }

    input:focus, textarea:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
    }

    button {
        padding: 0.7rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
    }

    button:hover {
        background: #1d4ed8;
    }

    button.danger {
        background: #dc2626;
    }

    button.danger:hover {
        background: #b91c1c;
    }

    .history {
        padding: 0.8rem 1rem;
        border-top: 1px solid #e5e7eb;
        color: #374151;
    }
</style>
