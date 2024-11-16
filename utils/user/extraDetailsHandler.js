const handleExtraDetails = (user) => {
  //  CoffeeShop
  const uniqueVisitedCoffeeShops = [];
  user.visitedCoffeeShops.forEach((shopId) => {
    if (shopId) {
      const existingShop = uniqueVisitedCoffeeShops.find((shop) =>
        shop.equals(shopId)
      );
      if (existingShop) {
        ++existingShop.count;
      } else {
        uniqueVisitedCoffeeShops.push(shopId);
      }
    }
  });
  user.visitedCoffeeShops = uniqueVisitedCoffeeShops;

  const uniqueOrderedProducts = [];
  user.orderedProducts.forEach((orderId) => {
    if (orderId) {
      const existingProduct = uniqueOrderedProducts.find((product) =>
        product.equals(orderId)
      );
      if (existingProduct) {
        ++existingProduct.count;
      } else {
        uniqueOrderedProducts.push(orderId);
      }
    }
  });
  user.orderedProducts = uniqueOrderedProducts;


  if (user.orderedProducts.length > 0) {
    const sortedProducts = this.orderedProducts.sort(
      (a, b) => b.count - a.count
    );

    user.extraDetails.mostOrderedThreeProducts = sortedProducts.slice(0, 3);
  } else {
    user.extraDetails.mostOrderedThreeProducts = [];
  }
};
