document.addEventListener("DOMContentLoaded", () => {
const theme = localStorage.getItem('theme') || 'modern';
const mode = localStorage.getItem('mode') || 'dark';
const body = document.body;
body.classList.remove('theme-modern', 'theme-classic', 'theme-minimal', 'mode-light', 'mode-dark');
body.classList.add(`mode-${mode}`);
body.classList.add(`theme-${theme}`);
});