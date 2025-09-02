import { useState, useEffect } from "react";
import ReportTable from "@/components/ReportTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import apiService from "@/services/apiService";

// Types
interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  type: "dish" | "drink";
  drinkCategory?: string;
}
type PaymentMethod = "cash" | "electronic";

interface Restaurant {
  id: string;
  name: string;
}

interface Order {
  id: string;
  time: string;
  product: string;
  type: "dish" | "drink";
  drinkCategory?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
}

export default function ManagerDashboard() {
  // Debug : afficher le token dans la console
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    console.log("Token d'authentification:", token);
  }, []);
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dish, setDish] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [drink, setDrink] = useState("");
  const [drinkCategory, setDrinkCategory] = useState("");
  const [drinkPrice, setDrinkPrice] = useState("");
  const [drinkQuantity, setDrinkQuantity] = useState("1");
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  // Pour le rapport
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");

  // Load user & restaurants
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      window.location.href = "/login";
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    apiService
      .getRestaurants()
      .then((data) => {
        setRestaurants(data);
        let found = null;
        if (parsedUser.restaurantId) {
          found = data.find((r: Restaurant) => r.id === parsedUser.restaurantId);
        }
        // Si le manager n'a pas de restaurantId ou le restaurant n'est pas trouvé, prendre le premier restaurant disponible
        if (!found && data.length > 0) {
          found = data[0];
        }
        setRestaurant(found || null);
        setSelectedRestaurant(found ? found.id : "");
      })
      .catch((error) => {
        console.error("Erreur chargement restaurants:", error);
      });
  }, []);

  // Charger les commandes du rapport
  useEffect(() => {
    if (selectedRestaurant && selectedDate) {
      apiService
        .getOrders(selectedRestaurant, selectedDate)
        .then((response) => {
          // Prendre en compte le format { data: [...] } de l'API
          const data = response?.data ?? response;
          if (Array.isArray(data)) {
            setOrders(
              data.map((o: any) => {
                // Sécurisation et fallback pour chaque champ attendu
                const product = o.product ?? o.name ?? '';
                const type = o.type ?? '';
                const quantity = Number(o.quantity ?? 0);
                // On tente toutes les variantes possibles pour le prix unitaire
                let unitPrice = o.unitPrice ?? o.unit_price ?? o.price;
                if (unitPrice === undefined && o.total_price && quantity) {
                  unitPrice = Number(o.total_price) / quantity;
                }
                unitPrice = Number(unitPrice ?? 0);
                // Idem pour le total
                let totalPrice = o.totalPrice ?? o.total_price;
                if (totalPrice === undefined && unitPrice && quantity) {
                  totalPrice = unitPrice * quantity;
                }
                totalPrice = Number(totalPrice ?? 0);
                return {
                  id: o.id?.toString() ?? '',
                  time: o.time ?? '',
                  product,
                  type,
                  drinkCategory: o.drinkCategory ?? o.drink_category ?? undefined,
                  quantity,
                  unitPrice,
                  totalPrice,
                  paymentMethod: o.paymentMethod ?? o.payment_method ?? '',
                };
              })
            );
          } else {
            setOrders([]);
          }
        })
        .catch((err) => console.error("Erreur chargement commandes:", err));
    }
  }, [selectedRestaurant, selectedDate]);

  // Utils
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getDrinkCategoryLabel = (category: string) => {
    switch (category) {
      case "petite_bouteille":
        return "Petite bouteille";
      case "grande_bouteille":
        return "Grande bouteille";
      case "canette":
        return "Canette";
      case "bouteille_plastique":
        return "Bouteille plastique";
      case "autre":
        return "Autres";
      default:
        return category;
    }
  };

  const getTotal = () =>
    order.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Actions
  const addDish = () => {
    if (!dish || !price) return;
    setOrder([
      ...order,
      { name: dish, price: Number(price), quantity: Number(quantity), type: "dish" },
    ]);
    setDish("");
    setPrice("");
    setQuantity("1");
  };

  const addDrink = () => {
    if (!drink || !drinkCategory || !drinkPrice) return;
    setOrder([
      ...order,
      {
        name: drink,
        price: Number(drinkPrice),
        quantity: Number(drinkQuantity),
        type: "drink",
        drinkCategory,
      },
    ]);
    setDrink("");
    setDrinkCategory("");
    setDrinkPrice("");
    setDrinkQuantity("1");
  };

  const removeItem = (index: number) => {
    setOrder(order.filter((_, i) => i !== index));
  };

  const confirmOrder = async () => {
    if (!order.length) return alert("Veuillez ajouter des articles.");
    if (!restaurant) {
      alert("Aucun restaurant sélectionné. Impossible d'enregistrer la commande.");
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    try {
      const total = getTotal();
      const orderData = {
        restaurant_id: restaurant ? Number(restaurant.id) : undefined,
        items: order.map(item => ({
          name: item.name,
          type: item.type,
          drink_category: item.drinkCategory !== undefined ? item.drinkCategory : null,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        })),
        payment_method: paymentMethod,
        total_amount: getTotal(),
      };
      console.log("Payload envoyé au serveur:", orderData);
      await apiService.createOrder(orderData);
      setOrder([]);
      alert("Commande enregistrée !");
      // Refresh report
      if (selectedRestaurant && selectedDate) {
        const data = await apiService.getOrders(selectedRestaurant, selectedDate);
        setOrders(data);
      }
    } catch (error) {
      console.error("Erreur enregistrement commande:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // Calcul des totaux pour le rapport
  const grandTotal = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const cashTotal = orders
    .filter((o) => o.paymentMethod === "cash")
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const electronicTotal = orders
    .filter((o) => o.paymentMethod === "electronic")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tableau de bord - Gérant</h1>
        <Button onClick={handleLogout}>Déconnexion</Button>
      </div>

      {restaurant && (
        <p className="text-muted-foreground">
          Restaurant : {restaurant.name}
        </p>
      )}

  {/* Bouton Rapport supprimé */}

      {/* --- SECTION COMMANDE --- */}
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle commande</CardTitle>
          <CardDescription>Ajouter plats ou boissons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ajouter un plat */}
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Nom du plat" value={dish} onChange={(e) => setDish(e.target.value)} />
            <Input type="number" placeholder="Prix" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input type="number" min="1" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Button onClick={addDish}>Ajouter plat</Button>
          </div>

          {/* Ajouter une boisson */}
          <div className="grid grid-cols-5 gap-2">
            <Input placeholder="Nom boisson" value={drink} onChange={(e) => setDrink(e.target.value)} />
            <Select value={drinkCategory} onValueChange={setDrinkCategory}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="petite_bouteille">Petite bouteille</SelectItem>
                <SelectItem value="grande_bouteille">Grande bouteille</SelectItem>
                <SelectItem value="canette">Canette</SelectItem>
                <SelectItem value="bouteille_plastique">Bouteille plastique</SelectItem>
                <SelectItem value="autre">Autres</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Prix" value={drinkPrice} onChange={(e) => setDrinkPrice(e.target.value)} />
            <Input type="number" min="1" placeholder="Qté" value={drinkQuantity} onChange={(e) => setDrinkQuantity(e.target.value)} />
            <Button onClick={addDrink}>Ajouter boisson</Button>
          </div>

          {/* Commande en cours */}
          <Card>
            <CardHeader>
              <CardTitle>Commande en cours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span>
                    {item.name} ({item.quantity} × {formatCurrency(item.price)})
                    {item.type === "drink" && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {getDrinkCategoryLabel(item.drinkCategory || "")}
                      </span>
                    )}
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => removeItem(i)}>Supprimer</Button>
                </div>
              ))}

              <div className="text-right font-bold">
                Total : {formatCurrency(getTotal())}
              </div>

              <Select value={paymentMethod} onValueChange={(val: PaymentMethod) => setPaymentMethod(val)}>
                <SelectTrigger><SelectValue placeholder="Mode de paiement" /></SelectTrigger>
                <SelectContent>
   
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="electronic">Électronique</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={confirmOrder} disabled={isProcessing}>
                {isProcessing ? "Enregistrement..." : "Valider la commande"}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* --- SECTION RAPPORT --- */}
      <div className="flex justify-end mb-8">
        {selectedRestaurant && (
          <Button
            variant="outline"
            className="border-glass-border"
            onClick={() => {
              window.location.href = `/reports?restaurant=${selectedRestaurant}`;
            }}
          >
            Rapport
          </Button>
        )}
      </div>
    </div>
  );
}
