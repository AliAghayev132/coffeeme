const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const Shop = require("../../schemas/Shop");
const { PARTNERS_CONNECTIONS } = require("../../utils/socket/websokcetUtil");

const updateLocation = async (req, res) => {
  try {
    const { email } = req.user;
    const { latitude, longitude } = req.body;
    console.log({ latitude, longitude });

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and Longitude are required" });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Kullanıcının konumuna yakın dükkanları bul
    const shops = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude], // Kullanıcının lokasyonu
          },
          distanceField: "distance", // Mesafeyi saklayacağımız alan
          spherical: true, // Spherical model kullan
          minDistance: 0, // Mesafe sıfırdan başlasın
          maxDistance: 500,
        },
      },
    ]);

    // Eğer dükkan bulunduyse partnerleri güncelle
    for (const shop of shops) {
      const partner = await Partner.findOne({ shop: shop._id }).populate(
        "shop"
      );
      if (partner) {
        // closeUsers dizisinde kullanıcıyı bul3
        const userInCloseUsers = partner.closeUsers.find(
          (closeUser) => closeUser.userId.toString() === user._id.toString()
        );
        if (!userInCloseUsers) {
          // Kullanıcı closeUsers dizisine ekle
          partner.closeUsers.push({
            userId: user._id,
            lastLocationUpdate: Date.now(),
          });
          await partner.save(); // Partner kaydet

          if (PARTNERS_CONNECTIONS[partner._id]) {
            PARTNERS_CONNECTIONS[partner._id].send(
              JSON.stringify({
                type: "CLOSE_USER",
                data: {
                  _id: user._id,
                  firstName: user.firstname,
                  secondName: user.secondname,
                  birthDate: user.birthdate,
                  image: user.image,
                  birthDate: user.birthdate,
                  gender: user.gender,
                },
              })
            );
          }
        }
      }
    }

    user.lastLocationUpdate = {
      date: Date.now(),
      location: {
        latitude: latitude || 40.3852952, // Varsayılan değer ekleyin
        longitude: longitude || 49.8508528, // Varsayılan değer ekleyin
      },
    };

    await user.save();
    return res.status(200).json({ success: true, shops });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email }).populate({
      path: "notifications",
      select: "title message date",
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Internal server error" });

    return res.status(200).json({
      message: "All notifications got",
      success: true,
      notifications: user.notifications,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { updateLocation, getNotifications };
