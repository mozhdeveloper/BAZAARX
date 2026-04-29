import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useBuyerStore } from "../stores/buyerStore";
import Header from "../components/Header";
import { Gift, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

const SharedRegistryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [registry, setRegistry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { registries, setQuickOrder, loadPublicRegistry, profile } = useBuyerStore();

  // Fetch public registry from backend on mount
  useEffect(() => {
    const fetchPublicRegistry = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Try to fetch public registry from database
        const found = await loadPublicRegistry(id);
        if (found) {
          setRegistry(found);
        } else {
          // Also try local state (for already loaded registries)
          const localFound = registries.find(
            (r) => r.id === id || r.title.toLowerCase().replace(/\s+/g, "-") === id,
          );
          if (localFound) {
            setRegistry(localFound);
          } else {
            // Fallback mock for demo if not found
            setRegistry({
              id: "demo-1",
              title: id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              sharedDate: "Feb 4, 2026",
              category: "Celebration",
              products: [],
              privacy: "link",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching public registry:", error);
        // Fallback mock for demo
        setRegistry({
          id: "demo-1",
          title: id?.replace(/-/g, " ")?.replace(/\b\w/g, (l) => l.toUpperCase()) || "Registry",
          sharedDate: "Feb 4, 2026",
          category: "Celebration",
          products: [],
          privacy: "link",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicRegistry();
  }, [id, loadPublicRegistry, registries]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-wash)]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p>Loading registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      {!profile && (
        <div className="bg-orange-50 text-orange-800 text-sm py-2 px-4 text-center border-b border-orange-100 font-medium">
          You are viewing this as a guest. Please log in to purchase a gift.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="bg-[var(--brand-wash)] text-[var(--brand-primary)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                {registry.category === 'baby' ? "BABY SHOWER" : (registry.category?.toUpperCase() || "GIFT LIST")}
              </span>
              <span className="text-sm text-gray-500">
                Shared on {registry.sharedDate}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                Privacy: {registry.privacy || "link"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {registry.title}
            </h1>
            {!registry.delivery?.showAddress && (
              <p className="text-sm text-gray-500 mt-2">
                Address hidden by owner.
              </p>
            )}
            {registry.delivery?.showAddress && (
              <p className="text-sm text-gray-700 mt-2">
                Address shared with gifters. (Details provided at checkout.)
              </p>
            )}
          </div>

          <div className="p-8">
            {!registry.products || registry.products.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-gray-50 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium">No items yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  This registry is currently empty.
                </p>
                <Button
                  onClick={() => navigate("/shop")}
                  className="mt-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-full px-6"
                >
                  Browse Shop
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {registry.products.map((product: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                      {/* Fix: fallback to images[0] when image is empty — mirrors mobile's item.image || item.images?.[0] */}
                      {(product.image || product.images?.[0]) ? (
                        <img loading="lazy" 
                          src={product.image || product.images?.[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Gift className="w-12 h-12 text-gray-300" />
                      )}
                    </div>
                    {product.status && product.status !== 'available' && (
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide mb-2 w-fit",
                        product.status === 'out_of_stock' ? "bg-red-100 text-red-600" :
                        product.status === 'seller_on_vacation' ? "bg-amber-100 text-amber-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {product.status.replace(/_/g, ' ')}
                      </div>
                    )}
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h4>
                    {product.selectedVariant && (
                      <p className="text-xs text-gray-600 mb-1">
                        Variant: {product.selectedVariant.name}
                        {product.selectedVariant.attributes
                          ? ` • ${Object.values(product.selectedVariant.attributes).join(" / ")}`
                          : ""}
                      </p>
                    )}
                    <p className="text-sm text-[var(--brand-primary)] font-medium mb-2">
                      {product.selectedVariant?.price ??
                        product.price ??
                        "Price varies"}
                    </p>
                    <div className="text-xs text-gray-500 mb-3 flex justify-between">
                      <span>Requested: {product.requestedQty || 1}</span>
                      <span>Received: {product.receivedQty || 0}</span>
                    </div>

                    {(product.receivedQty || 0) >= (product.requestedQty || 1) ? (
                      <Button
                        className="w-full mt-auto bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-not-allowed"
                        size="sm"
                        disabled
                      >
                        Fulfilled
                      </Button>
                    ) : product.status && product.status !== 'available' ? (
                      <Button
                        className="w-full mt-auto bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                        variant="outline"
                        size="sm"
                        disabled
                      >
                        Unavailable
                      </Button>
                    ) : !profile ? (
                      <Button
                        className="w-full mt-auto bg-white text-[var(--brand-primary)] border border-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                        size="sm"
                        onClick={() => {
                          sessionStorage.setItem('redirect_to', location.pathname);
                          navigate("/login");
                        }}
                      >
                        Log in to Buy Gift
                      </Button>
                    ) : (
                      <Button
                        className="w-full mt-auto"
                        size="sm"
                        onClick={() => {
                          const qty = Math.max(1, product.requestedQty || 1);
                          setQuickOrder(
                            product,
                            qty,
                            product.selectedVariant,
                            registry.id,
                          );
                          navigate("/checkout");
                        }}
                      >
                        Buy Gift
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedRegistryPage;
