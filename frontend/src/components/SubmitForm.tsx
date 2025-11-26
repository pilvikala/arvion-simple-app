import type { FormEvent } from "react";
import FormData from "form-data";
import { useState } from "react";

export const SubmitForm = () => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const form = new FormData();
            form.append('title', (event.target as HTMLFormElement).title);
            const response = await fetch('/submit', {
                method: 'POST',
                body: form.toString(),
            });
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const data = await response.json();
            console.log(data);
        } catch (err) {
            setError('Failed to submit form: ' + err);
        } finally {
            setSubmitting(false);
        }
    };
    return <form className="submit-form" onSubmit={handleSubmit}>
        <div className="form-group">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" placeholder="Title" required />
        </div>
        <button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
        {error && <p className="form-error">{error}</p>}
    </form>;
};
