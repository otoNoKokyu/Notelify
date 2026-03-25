/**
 * Formats a date string into a friendly format.
 * If same day: "HH:MM AM/PM"
 * If different day: "MMM D, HH:MM AM/PM"
 * @param {string} dateStr 
 * @returns {string}
 */
export const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();

    const isSameDay = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOptions = { month: 'short', day: 'numeric' };

    if (isSameDay) {
        return date.toLocaleTimeString('en-US', timeOptions);
    } else {
        const d = date.toLocaleDateString('en-US', dateOptions);
        const t = date.toLocaleTimeString('en-US', timeOptions);
        return `${d}, ${t}`;
    }
};
