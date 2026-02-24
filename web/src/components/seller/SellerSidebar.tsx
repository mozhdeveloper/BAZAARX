import { BaseSellerSidebar } from "@/components/seller/BaseSellerSidebar";
import { sellerLinks } from "@/config/sellerLinks";

export const SellerSidebar = () => {
  return <BaseSellerSidebar links={sellerLinks} subtitle="Seller Hub" />;
};
