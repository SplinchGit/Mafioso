import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { GUNS, PROTECTION } from '../../../shared/constants';

type StoreTab = 'guns' | 'protection' | 'bank';

const Store = () => {
  const { player, buyGun, buyProtection, swissBank, isLoading } = useGameStore();
  const [activeTab, setActiveTab] = useState<StoreTab>('guns');
  const [selectedGun, setSelectedGun] = useState<number | null>(null);
  const [selectedProtection, setSelectedProtection] = useState<number | null>(null);
  const [bankAction, setBankAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [bankAmount, setBankAmount] = useState<string>('');

  if (!player) return null;

  const playerGun = player.gunId !== undefined ? GUNS[player.gunId] : null;
  const playerProtection = player.protectionId !== undefined ? PROTECTION[player.protectionId] : null;

  const canAffordGun = (price: number) => player.money >= price;
  const canAffordProtection = (price: number) => player.money >= price;

  const canBuyGun = (gunId: number) => {
    if (!canAffordGun(GUNS[gunId].price)) return false;
    if (gunId === 0) return true; // First gun can always be bought
    return player.gunId === gunId - 1; // Must own previous gun
  };

  const canBuyProtection = (protectionId: number) => {
    if (!canAffordProtection(PROTECTION[protectionId].price)) return false;
    if (protectionId === 0) return true; // First protection can always be bought
    return player.protectionId === protectionId - 1; // Must own previous protection
  };

  const handleBuyGun = async () => {
    if (selectedGun === null) return;
    const success = await buyGun(selectedGun);
    if (success) {
      setSelectedGun(null);
    }
  };

  const handleBuyProtection = async () => {
    if (selectedProtection === null) return;
    const success = await buyProtection(selectedProtection);
    if (success) {
      setSelectedProtection(null);
    }
  };

  const handleBankTransaction = async () => {
    const amount = parseInt(bankAmount);
    if (!amount || amount <= 0) return;
    
    const success = await swissBank(bankAction, amount);
    if (success) {
      setBankAmount('');
    }
  };

  const maxDeposit = player.money;
  const maxWithdraw = player.swissBank;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">🏪 Store</h1>
        <p className="text-mafia-gray-400 text-lg">
          Equip yourself for the dangerous life ahead
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => setActiveTab('guns')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'guns'
              ? 'bg-mafia-red text-white'
              : 'bg-mafia-gray-700 text-mafia-gray-400 hover:bg-mafia-gray-600'
          }`}
        >
          🔫 Guns
        </button>
        <button
          onClick={() => setActiveTab('protection')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'protection'
              ? 'bg-mafia-red text-white'
              : 'bg-mafia-gray-700 text-mafia-gray-400 hover:bg-mafia-gray-600'
          }`}
        >
          🛡️ Protection
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'bank'
              ? 'bg-mafia-red text-white'
              : 'bg-mafia-gray-700 text-mafia-gray-400 hover:bg-mafia-gray-600'
          }`}
        >
          🏦 Swiss Bank
        </button>
      </div>

      {/* Guns Tab */}
      {activeTab === 'guns' && (
        <div>
          {/* Current Gun */}
          <div className="card-mafia mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Current Weapon</h2>
            
            {playerGun ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-mafia-gold mb-2">{playerGun.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-mafia-gray-400">Damage Reduction: </span>
                      <span className="text-white font-semibold">÷{playerGun.divisor}</span>
                    </div>
                    <div>
                      <span className="text-mafia-gray-400">Cost: </span>
                      <span className="text-money font-semibold">${playerGun.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-6xl">🔫</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👊</div>
                <h3 className="text-xl font-bold text-mafia-gray-400 mb-2">Unarmed</h3>
                <p className="text-mafia-gray-500">
                  You don't own a weapon yet. Buy one to improve your shooting efficiency!
                </p>
              </div>
            )}
          </div>

          {/* Available Guns */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Available Weapons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {GUNS.map((gun) => {
                const canBuy = canBuyGun(gun.id);
                const isOwned = player.gunId === gun.id;
                
                return (
                  <div
                    key={gun.id}
                    className={`card-mafia cursor-pointer transition-all duration-300 ${
                      isOwned
                        ? 'opacity-50 cursor-not-allowed'
                        : selectedGun === gun.id
                        ? 'ring-2 ring-mafia-red scale-105'
                        : canBuy
                        ? 'hover:scale-105 hover:shadow-xl'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canBuy && !isOwned && setSelectedGun(gun.id)}
                  >
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">🔫</div>
                      <h3 className="text-lg font-bold text-white mb-1">{gun.name}</h3>
                      {isOwned && (
                        <span className="text-sm font-semibold text-mafia-gold">OWNED</span>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-mafia-gray-400">Damage Reduction:</span>
                        <span className="text-white font-semibold">÷{gun.divisor}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-mafia-gray-400">Price:</span>
                        <span className={`font-semibold ${canAffordGun(gun.price) ? 'text-money' : 'text-blood'}`}>
                          ${gun.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!canBuy && !isOwned && (
                      <div className="bg-blood/20 border border-blood rounded p-2 mb-3">
                        <p className="text-blood text-xs text-center">
                          {!canAffordGun(gun.price) 
                            ? 'Not enough money' 
                            : gun.id > 0 ? `Need ${GUNS[gun.id - 1].name} first` : 'Cannot buy'
                          }
                        </p>
                      </div>
                    )}

                    {selectedGun === gun.id && (
                      <div className="bg-mafia-red/20 border border-mafia-red rounded p-2 mb-3">
                        <p className="text-mafia-red text-xs text-center">Selected for purchase</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purchase Confirmation */}
          {selectedGun !== null && (
            <div className="card-mafia">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-4">Confirm Purchase</h3>
                
                <div className="bg-mafia-gray-700 rounded-lg p-6 mb-6">
                  <div className="text-4xl mb-3">🔫</div>
                  <h4 className="text-xl font-bold text-mafia-gold mb-2">
                    {GUNS[selectedGun].name}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <div className="text-white font-semibold">÷{GUNS[selectedGun].divisor}</div>
                      <div className="text-xs text-mafia-gray-400">Damage Reduction</div>
                    </div>
                  </div>
                  
                  <div className="text-money font-bold text-2xl">
                    ${GUNS[selectedGun].price.toLocaleString()}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setSelectedGun(null)}
                    className="btn-secondary flex-1"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleBuyGun}
                    className="btn-mafia flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Purchasing...' : 'Buy Weapon'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Protection Tab */}
      {activeTab === 'protection' && (
        <div>
          {/* Current Protection */}
          <div className="card-mafia mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Current Protection</h2>
            
            {playerProtection ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-mafia-gold mb-2">{playerProtection.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-mafia-gray-400">Defense Multiplier: </span>
                      <span className="text-white font-semibold">×{playerProtection.multiplier}</span>
                    </div>
                    <div>
                      <span className="text-mafia-gray-400">Cost: </span>
                      <span className="text-money font-semibold">${playerProtection.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-6xl">🛡️</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👕</div>
                <h3 className="text-xl font-bold text-mafia-gray-400 mb-2">No Protection</h3>
                <p className="text-mafia-gray-500">
                  You don't own any protection yet. Buy some to defend against attacks!
                </p>
              </div>
            )}
          </div>

          {/* Available Protection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Available Protection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROTECTION.map((protection) => {
                const canBuy = canBuyProtection(protection.id);
                const isOwned = player.protectionId === protection.id;
                
                return (
                  <div
                    key={protection.id}
                    className={`card-mafia cursor-pointer transition-all duration-300 ${
                      isOwned
                        ? 'opacity-50 cursor-not-allowed'
                        : selectedProtection === protection.id
                        ? 'ring-2 ring-mafia-red scale-105'
                        : canBuy
                        ? 'hover:scale-105 hover:shadow-xl'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canBuy && !isOwned && setSelectedProtection(protection.id)}
                  >
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">🛡️</div>
                      <h3 className="text-lg font-bold text-white mb-1">{protection.name}</h3>
                      {isOwned && (
                        <span className="text-sm font-semibold text-mafia-gold">OWNED</span>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-mafia-gray-400">Defense Multiplier:</span>
                        <span className="text-white font-semibold">×{protection.multiplier}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-mafia-gray-400">Price:</span>
                        <span className={`font-semibold ${canAffordProtection(protection.price) ? 'text-money' : 'text-blood'}`}>
                          ${protection.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!canBuy && !isOwned && (
                      <div className="bg-blood/20 border border-blood rounded p-2 mb-3">
                        <p className="text-blood text-xs text-center">
                          {!canAffordProtection(protection.price) 
                            ? 'Not enough money' 
                            : protection.id > 0 ? `Need ${PROTECTION[protection.id - 1].name} first` : 'Cannot buy'
                          }
                        </p>
                      </div>
                    )}

                    {selectedProtection === protection.id && (
                      <div className="bg-mafia-red/20 border border-mafia-red rounded p-2 mb-3">
                        <p className="text-mafia-red text-xs text-center">Selected for purchase</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purchase Confirmation */}
          {selectedProtection !== null && (
            <div className="card-mafia">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-4">Confirm Purchase</h3>
                
                <div className="bg-mafia-gray-700 rounded-lg p-6 mb-6">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h4 className="text-xl font-bold text-mafia-gold mb-2">
                    {PROTECTION[selectedProtection].name}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <div className="text-white font-semibold">×{PROTECTION[selectedProtection].multiplier}</div>
                      <div className="text-xs text-mafia-gray-400">Defense Multiplier</div>
                    </div>
                  </div>
                  
                  <div className="text-money font-bold text-2xl">
                    ${PROTECTION[selectedProtection].price.toLocaleString()}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setSelectedProtection(null)}
                    className="btn-secondary flex-1"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleBuyProtection}
                    className="btn-mafia flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Purchasing...' : 'Buy Protection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Swiss Bank Tab */}
      {activeTab === 'bank' && (
        <div>
          <div className="card-mafia">
            <h2 className="text-2xl font-bold text-white mb-6">🏦 Swiss Bank</h2>
            <p className="text-mafia-gray-400 mb-6">
              Protect your money from being lost when you die. Swiss Bank funds are never lost!
            </p>

            {/* Current Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-mafia-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-2">💰 Cash on Hand</h3>
                <div className="text-3xl font-bold text-money">
                  ${player.money.toLocaleString()}
                </div>
                <p className="text-sm text-mafia-gray-400 mt-2">Lost on death</p>
              </div>

              <div className="bg-mafia-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-2">🏦 Swiss Bank</h3>
                <div className="text-3xl font-bold text-money">
                  ${player.swissBank.toLocaleString()}
                </div>
                <p className="text-sm text-mafia-gray-400 mt-2">Safe from death</p>
              </div>
            </div>

            {/* Transaction Form */}
            <div className="bg-mafia-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Transaction</h3>
              
              {/* Action Selection */}
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setBankAction('deposit')}
                  className={`px-4 py-2 rounded font-semibold transition-all ${
                    bankAction === 'deposit'
                      ? 'bg-mafia-red text-white'
                      : 'bg-mafia-gray-600 text-mafia-gray-400 hover:bg-mafia-gray-500'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setBankAction('withdraw')}
                  className={`px-4 py-2 rounded font-semibold transition-all ${
                    bankAction === 'withdraw'
                      ? 'bg-mafia-red text-white'
                      : 'bg-mafia-gray-600 text-mafia-gray-400 hover:bg-mafia-gray-500'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">
                  Amount to {bankAction}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 bg-mafia-gray-600 text-white border border-mafia-gray-500 rounded px-3 py-2 focus:outline-none focus:border-mafia-red"
                    min="1"
                    max={bankAction === 'deposit' ? maxDeposit : maxWithdraw}
                  />
                  <button
                    onClick={() => setBankAmount(String(bankAction === 'deposit' ? maxDeposit : maxWithdraw))}
                    className="px-4 py-2 bg-mafia-gray-600 text-white rounded hover:bg-mafia-gray-500 transition-colors"
                  >
                    Max
                  </button>
                </div>
                <p className="text-sm text-mafia-gray-400 mt-1">
                  Max {bankAction}: ${(bankAction === 'deposit' ? maxDeposit : maxWithdraw).toLocaleString()}
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleBankTransaction}
                disabled={isLoading || !bankAmount || parseInt(bankAmount) <= 0 || 
                  (bankAction === 'deposit' && parseInt(bankAmount) > maxDeposit) ||
                  (bankAction === 'withdraw' && parseInt(bankAmount) > maxWithdraw)}
                className="w-full btn-mafia"
              >
                {isLoading ? 'Processing...' : `${bankAction === 'deposit' ? 'Deposit' : 'Withdraw'} $${parseInt(bankAmount) || 0}`}
              </button>
            </div>

            {/* Bank Info */}
            <div className="mt-6 bg-mafia-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-bold text-mafia-red mb-2">ℹ️ Swiss Bank Info</h4>
              <ul className="text-sm text-mafia-gray-300 space-y-1">
                <li>• Swiss Bank funds are never lost when you die</li>
                <li>• Regular cash is lost when killed by other players</li>
                <li>• No fees for deposits or withdrawals</li>
                <li>• Access your funds anytime, anywhere</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;