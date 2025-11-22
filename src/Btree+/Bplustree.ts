// structures/BPlusTree.ts

export class BPlusNode<T> {
  isLeaf: boolean;
  keys: number[];
  values: T[];
  children: BPlusNode<T>[];
  next: BPlusNode<T> | null; // para hojas enlazadas

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
      const pos = node.keys.findIndex(k => k > key);
      if (pos === -1) {
        node.keys.push(key);
        node.values.push(value);
      } else {
        node.keys.splice(pos, 0, key);
        node.values.splice(pos, 0, value);
      }
    } else {
      let i = node.keys.length - 1;
      while (i >= 0 && key < node.keys[i]) i--;

      const child = node.children[i + 1];
      if (child.keys.length === this.order - 1) {
        this.splitChild(node, i + 1);
        if (key > node.keys[i + 1]) i++;
      }
      this.insertNonFull(node.children[i + 1], key, value);
    }
  }

  private splitChild(parent: BPlusNode<T>, index: number) {
    const node = parent.children[index];
    const mid = Math.floor((this.order - 1) / 2);

    const newNode = new BPlusNode<T>(node.isLeaf);
    newNode.keys = node.keys.splice(mid);
    newNode.values = node.values.splice(mid);

    if (!node.isLeaf) {
      newNode.children = node.children.splice(mid + 1);
      parent.keys.splice(index, 0, newNode.keys.shift()!);
    } else {
      newNode.next = node.next;
      node.next = newNode;
      parent.keys.splice(index, 0, newNode.keys[0]);
    }

    parent.children.splice(index + 1, 0, newNode);
  }

  // -----------------------------------------
  // BUSCAR
  // -----------------------------------------
  search(key: number): T | null {
    return this.searchNode(this.root, key);
  }

  private searchNode(node: BPlusNode<T>, key: number): T | null {
    let i = 0;

    while (i < node.keys.length && key > node.keys[i]) i++;

    if (node.isLeaf) {
      return node.keys[i] === key ? node.values[i] : null;
    } else {
      return this.searchNode(node.children[i], key);
    }
  }
}
