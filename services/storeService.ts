import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, setDoc, where } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { StoreItem, StoreOrder } from "@/lib/types";
import { STORE_ITEMS } from "@/lib/data/store";

export async function getProducts(): Promise<StoreItem[]> {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(collection(db, "products"));
  
  // Auto-seed if products collection is empty (for demo/convenience)
  if (snapshot.empty) {
    await Promise.all(
      STORE_ITEMS.map((item) => setDoc(doc(db, "products", item.id), item))
    );
    return STORE_ITEMS;
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoreItem, "id">),
  }));
}

export async function createProduct(input: Omit<StoreItem, "id">): Promise<StoreItem> {
  const { db } = ensureClientFirebase();
  const ref = await addDoc(collection(db, "products"), input);
  return { id: ref.id, ...input };
}

export async function updateProduct(id: string, input: Partial<Omit<StoreItem, "id">>): Promise<void> {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "products", id), input);
}

export async function deleteProduct(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, "products", id));
}

// Order Management
export async function getOrders(): Promise<StoreOrder[]> {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(collection(db, "orders"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoreOrder, "id">),
  }));
}

export async function createOrder(
  input: Omit<StoreOrder, "id">
): Promise<StoreOrder> {
  const { db } = ensureClientFirebase();
  const ref = await addDoc(collection(db, "orders"), input);
  return { id: ref.id, ...input };
}

export async function getOrdersForPatient(patientId: string): Promise<StoreOrder[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, "orders"), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoreOrder, "id">),
  }));
  // Sort newest-first client-side to avoid requiring a composite Firestore index.
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateOrderStatus(
  orderId: string,
  status: StoreOrder["status"]
): Promise<void> {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "orders", orderId), { status });
}
