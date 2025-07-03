  export class SymbolTable {
    constructor(parent = null, scopeName = 'global') {
      this.symbols = {};
      this.parent = parent;
      this.scopeName = scopeName;
    }

    declare(name, type, data) {
        this.symbols[name] = { name, type, ...data};
    }
  
    lookup(name) {
      if (this.symbols[name]) {
        return this.symbols[name];
      } else if (this.parent) {
        return this.parent.lookup(name); // busca nos escopos pais
      }
      return null;
    }
  }