export class PriorityQueue<T>{
    private items: T[];
    private cmp;
    private n: number; // Number of items in the priority queue

    /**
     * Priority Queue
     * @param max_elem Number of items to maximally store
     * @param cmp Compare function to sort by.
     */
    constructor(max_elem: number, cmp: (a: T, b: T) => boolean){
        this.items = new Array<T>(max_elem + 1);
        this.n = 0;
        this.items[0] = null;
        this.cmp = cmp; 
    }

    public length(): number{
        return this.n;
    }

    public peek(): T{
        return this.items[1];
    }

    public pop(): T{
        const ret = this.items[1];

        // Move last item to top and bubble-down
        this.items[1] = this.items[this.n];
        this.items[this.n] = null;
        this.n--;

        var item_idx = 1;
        while (item_idx < this.n){
            // Swap with smaller child
            const left_idx = this.left_child_idx(item_idx);
            const right_idx = this.right_child_idx(item_idx);

            const swap_candidate = right_idx > this.n || this.cmp(this.items[left_idx], this.items[right_idx]) ? left_idx : right_idx;

            if (swap_candidate <= this.n && !this.cmp(this.items[item_idx], this.items[swap_candidate])){
                this.swap(item_idx, swap_candidate);
                item_idx = swap_candidate;
                continue;
            }
            break;
        }
        return ret;
    }

    public push(item: T){
        this.items[++this.n] = item; // Add item to end of array

        // Bubble-up
        var item_idx = this.n;
        var parent = this.parent_idx(item_idx);
        while (parent != 0 && this.cmp(item, this.items[parent])){
            this.swap(item_idx, parent);
            item_idx = parent;
            parent = this.parent_idx(item_idx);
        }
    }

    /**
     * Swaps items stored at index idx_a and idx_b
     */
    private swap(idx_a: number, idx_b: number){
        const temp = this.items[idx_a];
        this.items[idx_a] = this.items[idx_b];
        this.items[idx_b] = temp;
    }

    private parent_idx(idx: number): number{
        return idx >> 1;
    }

    private left_child_idx(idx: number): number{
        return idx << 1;
    }

    private right_child_idx(idx: number): number{
        return (idx << 1) + 1;
    }

    /**
     * TEST: Determines whether the priority-queue still upholds all the correct properties.
     */
    public priority_invariant(){
        for (var i = 1; i < this.n; i++){
            const left_child = this.left_child_idx(i);
            if (left_child <= this.n && !this.cmp(this.items[i], this.items[left_child])){
                throw new Error("Comparator invalid for parent-left");
            }

            const right_child = this.right_child_idx(i);
            if (right_child <= this.n && !this.cmp(this.items[i], this.items[right_child])){
                throw new Error("Comparator invalid for parent-right");
            }
        }
    }
}


export function priority_queue_tester(){
    const len = 100;
    const queue = new PriorityQueue<number>(len, (a,b) => a <= b);

    for (var i = 0; i < len; i++){
        queue.push(Math.floor(Math.random()*100));
        queue.priority_invariant()
    }

    
    for (var i = 0; i < len; i++){
        console.log(queue.pop());
        queue.priority_invariant();
    }
}