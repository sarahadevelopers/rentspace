// Dynamic base path for GitHub Pages
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace';
    }
    return '';
};
const basePath = getBasePath();
