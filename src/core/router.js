export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'home';
        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    register(path, handler) {
        this.routes.set(path, handler);
        return this;
    }

    setDefault(path) {
        this.defaultRoute = path;
        return this;
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || this.defaultRoute;
        const [route, ...params] = hash.split('/');
        
        if (this.currentRoute === route) return;
        
        const handler = this.routes.get(route) || this.routes.get(this.defaultRoute);
        
        if (handler) {
            this.currentRoute = route;
            await handler(params);
            this.updateActiveNav(route);
        }
    }

    updateActiveNav(route) {
        document.querySelectorAll('[data-route]').forEach(el => {
            el.classList.toggle('active', el.dataset.route === route);
        });
    }

    navigate(path) {
        window.location.hash = path;
    }
}

export default new Router();