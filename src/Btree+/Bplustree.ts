// 1. Definimos un tipo para la función de comparación
// Retorna: -1 si a < b, 0 si a == b, 1 si a > b
export type Comparator<K> = (a: K, b: K) => number;

// 2. Nodo Genérico (K = Clave, V = Valor)
export class BPlusNode<K, V> {
  isLeaf: boolean;
  keys: K[];          // Antes number[], ahora K[]
  values: V[];        // Antes T[], ahora V[]
  children: BPlusNode<K, V>[];
  next: BPlusNode<K, V> | null;

  constructor(isLeaf = false) {
    this.isLeaf = isLeaf;
    this.keys = [];
    this.values = [];
    this.children = [];
    this.next = null;
  }
}

// 3. Árbol Genérico
export class BPlusTree<K, V> {
  order: number;
  root: BPlusNode<K, V>;
  compare: Comparator<K>; // Función para comparar claves

  // Constructor: Recibe el orden y opcionalmente un comparador personalizado
  constructor(order = 5, compare?: Comparator<K>) {
    this.order = order;
    this.root = new BPlusNode<K, V>(true);
    
    // Si no pasan comparador, usamos uno por defecto (sirve para number y string estándar)
    this.compare = compare || ((a: any, b: any) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });
  }

  insert(key: K, value: V) {
    const root = this.root;

    if (root.keys.length === this.order - 1) {
      const newRoot = new BPlusNode<K, V>(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      this.insertNonFull(newRoot, key, value);
    } else {
      this.insertNonFull(root, key, value);
    }
  }

  private insertNonFull(node: BPlusNode<K, V>, key: K, value: V) {
    if (node.isLeaf) {
      const existingIndex = node.keys.findIndex(k => this.compare(k, key) === 0);
      
      if (existingIndex !== -1) {
        node.values[existingIndex] = value; 
        return;
      }

      const pos = node.keys.findIndex(k => this.compare(k, key) > 0);
      
      if (pos === -1) {
        node.keys.push(key);
        node.values.push(value);
      } else {
        node.keys.splice(pos, 0, key);
        node.values.splice(pos, 0, value);
      }
    } else {
      let i = node.keys.length - 1;
      
      while (i >= 0 && this.compare(key, node.keys[i]) < 0) {
        i--;
      }

      const childIndex = i + 1;
      const child = node.children[childIndex];

      if (child.keys.length === this.order - 1) {
        this.splitChild(node, childIndex);
        
        if (this.compare(key, node.keys[childIndex]) > 0) { 
           i++; 
        }
      }
      this.insertNonFull(node.children[i + 1], key, value);
    }
  }

  private splitChild(parent: BPlusNode<K, V>, index: number) {
    const node = parent.children[index];
    const mid = Math.floor(node.keys.length / 2);

    const newNode = new BPlusNode<K, V>(node.isLeaf);

    newNode.keys = node.keys.slice(mid);
    newNode.values = node.values.slice(mid); 

    if (node.isLeaf) {
      newNode.next = node.next;
      node.next = newNode;

      node.keys = node.keys.slice(0, mid);
      node.values = node.values.slice(0, mid);

      const promotedKey = newNode.keys[0];

      parent.keys.splice(index, 0, promotedKey);
      parent.children.splice(index + 1, 0, newNode);

    } else {
      newNode.children = node.children.slice(mid + 1);
      node.children = node.children.slice(0, mid + 1);

      const promotedKey = node.keys[mid];
      parent.keys.splice(index, 0, promotedKey);

      node.keys = node.keys.slice(0, mid);
      newNode.keys = newNode.keys.slice(1); 

      parent.children.splice(index + 1, 0, newNode);
    }
  }


  // buscar

  search(key: K): V | null {
    return this.searchNode(this.root, key);
  }

  private searchNode(node: BPlusNode<K, V>, key: K): V | null {
    let i = 0;

    while (i < node.keys.length && this.compare(key, node.keys[i]) >= 0) {
        i++;
    }

    if (node.isLeaf) {
      const index = i - 1;
      if (index >= 0 && this.compare(node.keys[index], key) === 0) {
          return node.values[index];
      }
      return null;
    } else {
      return this.searchNode(node.children[i], key);
    }
  }
  
}