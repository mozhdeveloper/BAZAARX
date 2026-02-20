import React from "react";
import Header from "../components/Header";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Globe, Gift, RotateCcw } from "lucide-react";
import { RegistryDetailModal } from "../components/RegistryDetailModal";
import { CreateRegistryModal } from "../components/CreateRegistryModal";
import {
  useBuyerStore,
  RegistryPrivacy,
  RegistryDeliveryPreference,
} from "../stores/buyerStore";

// interface RegistryItem definition kept or unused if I use the store's type.
// Ideally should import from store but for now locally defined is fine if shapes match.
// I will just keep it or let it act as alias.
// No change needed here, just context note.
import { RegistryItem, Product } from "../stores/buyerStore";

// Remapping Component Props if needed or casting
// But RegistryDetailModal expects ITS own Product type (string price)
// I should update RegistryAndGiftingPage to fully use store types,
// AND cast when passing to RegistryDetailModal if minimal changes desired,
// OR update RegistryDetailModal to accept store types.
// Updating RegistryDetailModal is cleaner but might break other things.
// Casting in RegistryAndGiftingPage is safer for now.
const RegistryAndGiftingPage = () => {
  const { registries, createRegistry, addToRegistry, deleteRegistry } =
    useBuyerStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<RegistryItem | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleCreateRegistry = ({
    name,
    category,
    privacy,
    delivery,
  }: {
    name: string;
    category: string;
    privacy: RegistryPrivacy;
    delivery: RegistryDeliveryPreference;
  }) => {
    const newRegistry: RegistryItem = {
      id: Date.now().toString(),
      title: name,
      category: category,
      sharedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      imageUrl: "/gradGift.jpeg",
      products: [],
      privacy,
      delivery,
    };
    createRegistry(newRegistry);
  };

  const handleAddProductToRegistry = (
    registryId: string,
    productName: string,
  ) => {
    // Create a mock product that satisfies the store's Product interface
    // We cast to any because creating a full valid Product with all fields is tedious for this mock
    const newProduct: any = {
      id: Date.now().toString(),
      name: productName,
      price: 0,
      image: "",
      images: [],
      sellerId: "demo-seller",
      description: "Registry Item",
      category: "Gift",
      rating: 0,
      totalReviews: 0,
      sold: 0,
      isFreeShipping: false,
      location: "Manila",
      specifications: {},
      variants: [],
      seller: {
        id: "demo-seller",
        name: "Verified Seller",
        avatar: "",
        rating: 5,
        totalReviews: 10,
        followers: 100,
        isVerified: true,
        description: "",
        location: "",
        established: "",
        products: [],
        badges: [],
        responseTime: "",
        categories: [],
      },
    };
    addToRegistry(registryId, newProduct);
  };

  const handleRegistryClick = (item: RegistryItem) => {
    setSelectedRegistry(item);
    setIsDetailModalOpen(true);
  };
  const location = useLocation();

  // Check for navigation state to open create modal
  useEffect(() => {
    if (location.state && (location.state as any).openCreateModal) {
      setIsCreateModalOpen(true);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-0 pb-4 flex flex-col gap-2">
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-10 pt-1 pb-1">
          <Link
            to="/shop"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Shop
          </Link>
          <Link
            to="/collections"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Collections
          </Link>
          <Link
            to="/stores"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Stores
          </Link>
          <Link
            to="/registry"
            className="text-sm font-bold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-0.5"
          >
            Registry & Gifting
          </Link>
        </div>

        <div className="py-16 bg-hero-gradient backdrop-blur-md shadow-md rounded-3xl mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-6xl font-black text-[var(--text-headline)] mb-2 tracking-tight font-primary">
              Registry & {""}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--text-accent)]">
                Gifting
              </span>
            </h1>

            <p className="text-medium text-[var(--text-primary)] max-w-2xl mx-auto mb-6 font-medium">
              From wishlist to wow — turn every shared moment into the perfect
              gift.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-full font-medium hover:shadow-lg hover:opacity-90 transition-all shadow-md"
              >
                Create a registry
              </button>
            </div>
          </motion.div>
        </div>

        {/* Navigation Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: null, label: 'All Registries' },
              { id: 'wedding', label: 'Wedding' },
              { id: 'baby', label: 'Baby Shower' },
              { id: 'birthday', label: 'Birthday' },
              { id: 'graduation', label: 'Graduation' },
              { id: 'housewarming', label: 'Housewarming' },
              { id: 'christmas', label: 'Christmas' },
              { id: 'other', label: 'Other' }
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap border
                    ${isActive
                      ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-md scale-105"
                      : "bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:text-orange-500 shadow-sm"
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <section>
          <div className="flex items-center space-x-3 mb-4">
            <h3 className="text-xl font-bold">
              {activeCategory
                ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Registries`
                : "Your registries and gift lists"}
            </h3>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1 rounded-full border border-gray-300 hover:bg-gray-100 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {registries
              .filter((list) => {
                const mainCategories = ['wedding', 'baby', 'birthday', 'graduation', 'housewarming', 'christmas'];
                if (!activeCategory) return true;
                if (activeCategory === 'other') {
                  return !mainCategories.includes(list.category?.toLowerCase() || "");
                }
                return list.category?.toLowerCase() === activeCategory;
              })
              .map((list) => (
                <div
                  key={list.id}
                  onClick={() => handleRegistryClick(list as any)}
                  className="product-card-premium product-card-premium-interactive flex-row items-center w-full md:w-80 p-3 relative group"
                >
                  <div className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors">
                    {list.category}
                  </div>
                  <img
                    src={list.imageUrl}
                    alt="Gift list"
                    className="w-12 h-12 rounded object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-[var(--brand-primary)] text-sm">
                      {list.title}
                    </h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {list.products?.length || 0} items -{" "}
                      {list.sharedDate}
                    </p>
                  </div>
                </div>
              ))}
            {registries.filter((list) => {
              const mainCategories = ['wedding', 'baby', 'birthday', 'graduation', 'housewarming', 'christmas'];
              if (!activeCategory) return true;
              if (activeCategory === 'other') {
                return !mainCategories.includes(list.category?.toLowerCase() || "");
              }
              return list.category?.toLowerCase() === activeCategory;
            }).length === 0 && (
                <div className="w-full text-center py-12 text-gray-500 bg-card rounded-3xl border border-dashed border-gray-200">
                  No registries found.
                </div>
              )}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-4">
            Reasons to register with BazaarX
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              Icon={Globe}
              title="Earth's biggest selection"
              desc="Add items from BazaarX to create a gift registry for any occasion."
            />
            <FeatureCard
              Icon={Gift}
              title="Easy to share"
              desc="Share your gift registry with friends and family so they'll know exactly what gifts to get."
            />
            <FeatureCard
              Icon={RotateCcw}
              title="Extended returns"
              desc="Not quite right? Registry gifts have an extended return period."
            />
          </div>
        </section>

        <CreateRegistryModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateRegistry}
          initialCategory={activeCategory || ""}
        />

        <RegistryDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          registry={selectedRegistry as any}
          onAddProduct={handleAddProductToRegistry}
          onDelete={deleteRegistry}
        />
      </div>
    </div>
  );
};



const FeatureCard = ({
  Icon,
  title,
  desc,
}: {
  Icon: any;
  title: string;
  desc: string;
}) => (
  <div className="product-card-premium p-8 text-center flex flex-col items-center justify-center space-y-4 min-h-[220px]">
    <div className="p-3 bg-[var(--brand-wash)] rounded-full">
      <Icon
        size={32}
        className="text-[var(--brand-primary)]"
        strokeWidth={1.5}
      />
    </div>
    <h4 className="font-bold text-lg text-[var(--text-headline)]">{title}</h4>
    <p className="text-sm text-[var(--text-secondary)] max-w-[250px]">{desc}</p>
  </div>
);

export default RegistryAndGiftingPage;
