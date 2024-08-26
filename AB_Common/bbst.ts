import { Random, shuffle_array } from "./utils.js";

export abstract class BBST<T>{
    public abstract insert(item: T): void;
    public abstract predecessor(item: T): T;
    public abstract delete(item: T): void;
}

/*
class RBNode<T>{
    item: T;
    is_black: boolean;
    left: RBNode<T>;
    right: RBNode<T>;
    parent: RBNode<T>;

    constructor(item: T, is_black: boolean){
        this.item = item;
        this.is_black = is_black;
    }
}

/*
export class RBTree<T> extends BBST<T>{
    root: RBNode<T>;
    n: number;
    cmp: (a: T, B: T) => boolean;

    constructor(cmp: (a: T, B:T) => boolean){
        super();
        this.cmp = cmp;
        this.root = null;
        this.n = 0;
    }

    insert(item: T): void {
        if (this.n == 0){
            this.root = new RBNode(item, true);
            this.n++;
            return;
        }

    }

    predecessor(item: T): T {
        if (this.n==0)
            return null;
        var current_node = this.root;
        var predecessor = null;

        while (current_node != null && item != current_node.item){
            if (this.cmp(current_node.item, item))
                current_node = current_node.left;
            else{
                predecessor = current_node;
                current_node = current_node.right
            }
        }

        return predecessor.item;
    }


    private left_rotate(x: RBNode<T>){
        const y = x.right;
        //Turn y's left sub-tree into x's right sub-tree
        x.right = y.left;
        if (y.left != null )
            y.left.parent = x;
        //y's new parent was x's parent
        y.parent = x.parent;
        //Set the parent to point to y instead of x
        // First see whether we're at the root
        if (x.parent == null )
            this.root = y;
        else
            if ( x == x.parent.left)
                // x was on the left of its parent
                x.parent.left = y;
            else
                // x must have been on the right
                x.parent.right = y;
        // Finally, put x on y's left
        y.left = x;
        x.parent = y;
    }
}*/

class BinaryNode<T>{
    item: T;
    left: BinaryNode<T>;
    right: BinaryNode<T>;

    constructor(item: T){
        this.item = item;
        this.left = null;
        this.right = null
    }

    public n_children(): number{
        const n_left = this.left == null ? 0 : 1;
        const n_right = this.right == null ? 0 : 1;
        return n_left + n_right;
    }

    public *children() {
        if (this.left != null)
            yield this.left;
        if (this.right != null)
            yield this.right;
    } 
}

export class BinaryTree<T> extends BBST<T>{
    root: BinaryNode<T>;
    cmp: (a: T, b: T) => boolean;
    
    constructor(cmp: (a: T, b:T) => boolean){
        super();
        this.cmp = cmp;
        this.root = null;
    }

    public insert(item: T): void {
        // Tree is empty - initialize root
        const new_node = new BinaryNode(item); 
        if (this.root == null){
            this.root = new_node;
            return;
        }

        // Insert as a leaf
        var parent: BinaryNode<T> = null;
        var current_node = this.root;
        while (current_node != null){
            parent = current_node;
            current_node = this.cmp(item, current_node.item) ? current_node.left : current_node.right;
        }
    
        // Found location
        if (this.cmp(item, parent.item)){
            parent.left = new_node;
        } else
            parent.right = new_node;
    }

    public predecessor(item: T): T {
        var current_node: BinaryNode<T> = this.root;
        var pred: T = null;
        while (current_node != null && current_node.item != item){
            if (this.cmp(item, current_node.item)){
                current_node = current_node.left;
            } else {
                pred = current_node.item;
                current_node = current_node.right;
            }
        }
        return pred;
    }
    
    public delete(item: T): void {
        // Only zero or one element left?
        if (this.root == null)
            throw new Error("BST-Delete: Attempting to delete in empty tree.");

        // Attempt to find desired element to delete
        var parent: BinaryNode<T> = null;
        var current_node = this.root;
        while (current_node != null && current_node.item != item){
            parent = current_node;
            current_node = this.cmp(item, current_node.item) ? current_node.left : current_node.right;
        }
            
        // Element not found
        if (current_node == null)
            throw new Error("BST-Delete: Item not found.");


        // Node to delete has at most 1 child
        if (current_node.left == null || current_node.right == null){
            let child = current_node.left != null ? current_node.left : current_node.right;

            // Are we deleting the root?
            if (parent == null){
                this.root = child;
                return;
            }

            // Was the node to delete a left child?
            if (parent.left == current_node){
                parent.left = child;
            } else{
                parent.right = child;
            }
            return;
        }

        // Find successor of current_node to replace the key
        var smallest_parent = null;
        var smallest_child = current_node.right;
        while (smallest_child.left != null){
            smallest_parent = smallest_child;
            smallest_child = smallest_child.left;
        }

        if (smallest_parent != null){
            smallest_parent.left = smallest_child.right;
        } else
            current_node.right = smallest_child.right;
        current_node.item = smallest_child.item;
    }

    public *inorder(){
        yield* this.inorder_rec(this.root);
    }

    private *inorder_rec(x: BinaryNode<T>){
        if (x == null)
            return;

        yield* this.inorder_rec(x.left);
        yield x.item;
        yield* this.inorder_rec(x.right);
    }
}


export function bst_tester(){
    const len = 100;
    const queue = new BinaryTree<number>((a,b) => a <= b);
    const random = new Random("test");

    const items = [];
    for (var i = 0; i < len; i++){
        const value = 100*random.rand()>>0;
        items.push(value)
        queue.insert(value);
        console.log([...queue.inorder()]);
    }
    
    shuffle_array(items, random);

    for (var i = 0; i < len; i++){
        const to_remove = items.pop();
        queue.delete(to_remove);
        console.log([...queue.inorder()]);
    }
}