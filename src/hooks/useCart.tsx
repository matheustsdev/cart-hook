import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    console.log("useEffect");
  }, [cart]);

  // Verifica se há estoque do produto solicitado retornando um boolean
  async function haveStock(productId: number, amount: number) {
    const stock: Stock = (await api.get(`/stock/${productId}`)).data;
    if (stock.amount < amount) {
      toast.error("Quantidade solicitada fora de estoque");
      return false;
    }
    return true;
  }

  const addProduct = async (productId: number) => {
    try {
      //Fetch da lista de produtos
      const productToAdd = (await api.get(`/products/${productId}`)).data;

      // Verifica se existe um produto no carrinho
      const alreadyInCart =
        cart.findIndex((product: Product) => product.id === productId) !== -1;

      const addedProductIndexInCart = cart.findIndex(
        (product: Product) => product.id === productId
      );

      // Caso já exista produto no cart, chamar updateProductAmount, caso não, adicionar o produto no cart.
      if (alreadyInCart) {
        const newAmount: UpdateProductAmount = {
          productId: productId,
          amount: cart[addedProductIndexInCart].amount + 1,
        };
        console.log(productToAdd);
        updateProductAmount(newAmount);
      } else {
        // Caso não exista produto no cart, adicionar um novo no mesmo.
        if (await haveStock(productId, 1)) {
          productToAdd.amount = 1;
          setCart((prevCart) => [...prevCart, productToAdd]);
        }
      }
    } catch (e: any) {
      //Tentativa de passar no test "should not be able add a product that does not exist"
      const promiseError = "Request failed with status code 404";
      if (e.message === promiseError) {
        toast.error("Erro na adição do produto");
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let newCart: Product[] = [];
      cart.forEach((product) => {
        if (product.id !== productId) {
          newCart.push(product);
        }
      });

      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (await haveStock(productId, amount)) {
        let updatedCart: Product[] = [];
        cart.forEach((product) => {
          if (product.id === productId) {
            const updatedProduct = {
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.image,
              amount: amount,
            };
            updatedCart.push(updatedProduct);
          } else updatedCart.push(product);
        });

        setCart(updatedCart);
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
