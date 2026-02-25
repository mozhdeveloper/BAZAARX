import { BaseSellerSidebar } from "@/components/seller/BaseSellerSidebar";
import { unverifiedSellerLinks } from "@/config/sellerLinks";

export const UnverifiedSellerSidebar = () => {
  return (
    <BaseSellerSidebar
      links={unverifiedSellerLinks}
      subtitle="Verification Portal"
    />
  );
};
