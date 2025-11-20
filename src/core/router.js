export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.defaultRoute = 'home';
    this.validTools = [
      'base64-decoder',
      'base64-encoder',
      'png-to-ico',
      'json-formatter',
      'ico-analyzer',
      'xml-formatter',
      'json-toon-converter',
    ]; // List of valid tools
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

  isValidTool(toolName) {
    return this.validTools.includes(toolName);
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || this.defaultRoute;
    const [route, ...params] = hash.split('/');

    // Check if this is a valid route
    const handler = this.routes.get(route);

    if (!handler) {
      // For invalid routes, redirect to default route
      this.navigate(this.defaultRoute);
      return;
    }

    // Special validation for tool route - check if tool exists
    if (route === 'tool' && params.length > 0) {
      const toolName = params[0];
      if (!this.isValidTool(toolName)) {
        // Invalid tool, redirect to default
        this.navigate(this.defaultRoute);
        return;
      }
    }

    // For tool routes, we need to compare the full path including the tool name
    const fullRoute =
      route === 'tool' && params.length > 0 ? `${route}/${params[0]}` : route;
    if (this.currentRoute === fullRoute) return;

    this.currentRoute = fullRoute;
    await handler(params);
    this.updateActiveNav(route);
  }

  updateActiveNav(route) {
    document.querySelectorAll('[data-route]').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export default new Router();
