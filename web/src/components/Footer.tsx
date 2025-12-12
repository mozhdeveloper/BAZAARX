import React from 'react';

const Footer: React.FC = () => {
  const footerLinks = {
    'Customer Care': [
      'Help Center',
      'How to Buy',
      'How to Sell',
      'Payment Methods',
      'Shipping & Delivery',
      'Return & Refunds',
      'Contact Us'
    ],
    'About Bazaar': [
      'About Us',
      'Careers',
      'Press & Media',
      'Investor Relations',
      'Corporate Information',
      'Bazaar Blog',
      'Terms of Service'
    ],
    'Sell with Us': [
      'Seller Center',
      'Become a Seller',
      'Seller University',
      'Seller Stories',
      'Advertising',
      'Business Solutions',
      'Seller Support'
    ],
    'Follow Us': [
      'Facebook',
      'Instagram',
      'Twitter',
      'YouTube',
      'TikTok',
      'LinkedIn',
      'Newsletter'
    ]
  };

  return (
    <footer className="bg-[var(--text-primary)] text-white">
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <img 
                src="/Logo.png" 
                alt="Bazaar Logo" 
                className="w-12 h-12 object-contain"
              />
              <span className="text-2xl font-bold">Bazaar</span>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Supporting Filipino businesses and connecting communities through authentic local marketplace experiences.
            </p>
            
            {/* Download Apps */}
            <div className="space-y-3">
              <p className="font-semibold">Download the Bazaar App</p>
              <div className="flex gap-3">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png" 
                  alt="Google Play" 
                  className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                />
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/488px-Apple_logo_black.svg.png" 
                  alt="App Store" 
                  className="h-10 w-auto bg-white rounded px-2 cursor-pointer hover:opacity-80 transition-opacity"
                />
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold mb-4 text-lg">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-[var(--brand-primary)] transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-700 pt-8 mt-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="font-semibold mb-3">We Accept</p>
              <div className="flex flex-wrap gap-3">
                {['Visa', 'Mastercard', 'PayPal', 'GCash', 'Maya', 'BPI', 'BDO'].map((payment) => (
                  <div 
                    key={payment}
                    className="bg-white text-black px-3 py-2 rounded text-sm font-medium"
                  >
                    {payment}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold mb-3">Secured by</p>
              <div className="flex flex-wrap gap-3">
                {['SSL', 'Norton', 'McAfee'].map((security) => (
                  <div 
                    key={security}
                    className="bg-gray-800 text-white px-3 py-2 rounded text-sm border border-gray-600"
                  >
                    {security}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-6">
              <span>© 2024 Bazaar Philippines. All rights reserved.</span>
              <a href="#" className="hover:text-[var(--brand-primary)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--brand-primary)] transition-colors">Terms of Use</a>
            </div>
            
            <div className="flex items-center gap-4">
              <span>Country/Region:</span>
              <select className="bg-transparent border border-gray-600 rounded px-2 py-1 text-sm">
                <option value="ph">🇵🇭 Philippines</option>
                <option value="sg">🇸🇬 Singapore</option>
                <option value="my">🇲🇾 Malaysia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;