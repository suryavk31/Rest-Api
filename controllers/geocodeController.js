exports.getGeocode = async (req, res, apiKey) => {
  const { lat, lng } = req.query;
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error('Geocode API error:', data);
      return res.status(500).json({ error: 'Failed to fetch geocode' });
    }

    const postalCodeComponent = data.results[0].address_components.find(component => component.types.includes('postal_code'));
    const postalCode = postalCodeComponent ? postalCodeComponent.long_name : null;
    const formattedAddress = data.results[0].formatted_address;

    res.json({ ...data, postal_code: postalCode, formatted_address: formattedAddress });
  } catch (error) {
    console.error('Error fetching geocode:', error);
    res.status(500).json({ error: 'Failed to fetch geocode' });
  }
};
