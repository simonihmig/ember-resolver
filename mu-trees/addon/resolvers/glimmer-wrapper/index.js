import Ember from 'ember';
import GlimmerResolver from '@glimmer/resolver/resolver';
import RequireJSRegistry from '../../module-registries/requirejs';

const { DefaultResolver } = Ember;

const TEMPLATE_TO_PARTIAL = /^template:(.*\/)?_([\w-]+)/;

/*
 * Wrap the @glimmer/resolver in Ember's resolver API. Although
 * this code extends from the DefaultResolver, it should never
 * call `_super` or call into that code.
 */
const Resolver = DefaultResolver.extend({
  init() {
    this._super(...arguments);

    this._configRootName = this.config.app.rootName || 'app';

    if (!this.glimmerModuleRegistry) {
      this.glimmerModuleRegistry = new RequireJSRegistry(this.config, 'src');
    }

    this._glimmerResolver = new GlimmerResolver(this.config, this.glimmerModuleRegistry);
  },

  normalize: null,

  resolve(lookupString, referrer) {
    /*
     * Ember components require their lookupString to be massaged. Make this
     * as "pay-go" as possible.
     */
    if (referrer) {
      // make absolute
      let parts = referrer.split(':src/ui/');
      referrer = `${parts[0]}:/${this._configRootName}/${parts[1]}`;
      referrer = referrer.split('/template.hbs')[0];
    }

    if (lookupString.indexOf('template:components/') === 0) {
      lookupString = lookupString.replace('components/', '');
    } else if (lookupString.indexOf('template:') === 0) {
      /*
       * Ember partials are looked up as templates. Here we replace the template
       * resolution with a partial resolute when appropriate. Try to keep this
       * code as "pay-go" as possible.
       */
      let match = TEMPLATE_TO_PARTIAL.exec(lookupString);
      if (match) {
        let namespace = match[1] || '';
        let name = match[2];

        lookupString = `partial:${namespace}${name}`;
      } else {
        if (referrer) {
          throw new Error(`Cannot look up a route template ${lookupString} with a referrer`);
        }
        let parts = lookupString.split(':');
        lookupString = `template`;
        referrer = `route:/${this._configRootName}/routes/${parts[1]}`;
      }
    }

    return this._resolve(lookupString, referrer);
  },

  _resolve(lookupString, referrer) {
    return this._glimmerResolver.resolve(lookupString, referrer);
  }

});

export default Resolver;
