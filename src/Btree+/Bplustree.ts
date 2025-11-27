export class BPlusNode<T> {
  isLeaf: boolean;
  keys: number[];
  values: T[];
  children: BPlusNode<T>[];
  next: BPlusNode<T> | null;

  constructor(isLeaf = false) {
    this.isLeaf = isLeaf;
    this.keys = [];
    this.values = [];
    this.children = [];
    this.next = null;
  }
}

export class BPlusTree<T> {
  order: number;
  root: BPlusNode<T>;

  constructor(order = 4) {
    this.order = order;
    this.root = new BPlusNode<T>(true);
  }

  // -----------------------------------------
  // INSERTAR VALOR
  // -----------------------------------------
  insert(key: number, value: T) {
    const root = this.root;

    // Si la raíz está llena, el árbol crece en altura
    if (root.keys.length === this.order - 1) {
      const newRoot = new BPlusNode<T>(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      this.insertNonFull(newRoot, key, value);
    } else {
      this.insertNonFull(root, key, value);
    }
  }

  private insertNonFull(node: BPlusNode<T>, key: number, value: T) {
    if (node.isLeaf) {
      // MEJORA: Verificar si la clave ya existe para actualizarla en vez de duplicarla
      const existingIndex = node.keys.findIndex(k => k === key);
      if (existingIndex !== -1) {
        node.values[existingIndex] = value; // Actualizar valor de estación existente
        return;
      }

      const pos = node.keys.findIndex(k => k > key);
      if (pos === -1) {
        node.keys.push(key);
        node.values.push(value);
      } else {
        node.keys.splice(pos, 0, key);
        node.values.splice(pos, 0, value);
      }
    } else {
      // Nodo Interno
      let i = node.keys.length - 1;
      
      // Buscamos el hijo correcto. 
      // Nota: Aquí usamos < porque vamos de derecha a izquierda
      while (i >= 0 && key < node.keys[i]) i--;

      const childIndex = i + 1;
      const child = node.children[childIndex];

      if (child.keys.length === this.order - 1) {
        this.splitChild(node, childIndex);
        // Al dividir, una clave sube al nodo actual.
        // Verificamos si nuestra clave es mayor que la nueva clave promovida
        if (key > node.keys[childIndex]) { 
           // IMPORTANTE: Si es igual, insertNonFull en el hijo derecho manejará la lógica
           i++; 
        }
      }
      this.insertNonFull(node.children[i + 1], key, value);
    }
  }

  private splitChild(parent: BPlusNode<T>, index: number) {
    const node = parent.children[index];
    const mid = Math.floor(node.keys.length / 2);

    const newNode = new BPlusNode<T>(node.isLeaf);

    // Copiar claves y valores (temporalmente todo para luego cortar)
    newNode.keys = node.keys.slice(mid);
    newNode.values = node.values.slice(mid); // Solo relevante si es hoja, pero no daña

    if (node.isLeaf) {
      newNode.next = node.next;
      node.next = newNode;

      node.keys = node.keys.slice(0, mid);
      node.values = node.values.slice(0, mid);

      // En hojas, la clave se COPIA arriba (promotedKey es la primera del derecho)
      const promotedKey = newNode.keys[0];

      parent.keys.splice(index, 0, promotedKey);
      parent.children.splice(index + 1, 0, newNode);

    } else {
      // Nodo interno
      newNode.children = node.children.slice(mid + 1);
      node.children = node.children.slice(0, mid + 1);

      // En nodos internos, la clave SUBE (se quita del hijo)
      const promotedKey = node.keys[mid];
      
      parent.keys.splice(index, 0, promotedKey);

      node.keys = node.keys.slice(0, mid);
      // Removemos la clave que subió del nuevo nodo derecho
      newNode.keys = newNode.keys.slice(1); 

      parent.children.splice(index + 1, 0, newNode);
    }
  }

  // -----------------------------------------
  // BUSCAR (CORREGIDO)
  // -----------------------------------------
  search(key: number): T | null {
    return this.searchNode(this.root, key);
  }

  private searchNode(node: BPlusNode<T>, key: number): T | null {
    let i = 0;

    // CORRECCIÓN CRÍTICA:
    // Debemos avanzar mientras la clave buscada sea MAYOR O IGUAL a la clave del nodo.
    // Si key == node.keys[i], debemos ir al hijo derecho (i+1), por eso seguimos incrementando i.
    while (i < node.keys.length && key >= node.keys[i]) {
        i++;
    }

    if (node.isLeaf) {
      // En la hoja, 'i' habrá avanzado hasta pasar nuestra clave.
      // Debemos mirar una posición atrás (i-1) porque el bucle avanza uno extra cuando encuentra >=
      // O más simple: buscar linealmente o usar binary search en la hoja.
      // Dado el bucle de arriba, si key existe, 'i' se detuvo justo después de él (si key == keys[i-1])
      // O si es mayor que todos, i = length.
      
      // Ajuste para búsqueda exacta en hoja dado el bucle while modificado:
      const index = i - 1;
      if (index >= 0 && node.keys[index] === key) {
          return node.values[index];
      }
      return null;
    } else {
      // Nodo interno: descendemos por el hijo en la posición 'i'
      return this.searchNode(node.children[i], key);
    }
  }
}