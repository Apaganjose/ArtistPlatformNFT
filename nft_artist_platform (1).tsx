import React, { useState, useEffect } from 'react';
import { Upload, Wallet, Zap, CheckCircle, AlertCircle, FileImage } from 'lucide-react';

export default function NFTArtistPlatform() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [signer, setSigner] = useState(null);
  const [activeStep, setActiveStep] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Form state
  const [artFile, setArtFile] = useState(null);
  const [artPreview, setArtPreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    edition: '1',
    royalty: '10',
    contractName: 'MyArtNFT',
    contractSymbol: 'ART'
  });
  
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [contractAddress, setContractAddress] = useState('');

  // Connect Wallet with Web3
  const connectWallet = async () => {
    setLoading(true);
    try {
      // Check if window.ethereum exists (MetaMask, etc.)
      if (typeof window.ethereum === 'undefined') {
        setMessage('Please install MetaMask or a Web3 wallet');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];
      setWalletAddress(address);
      setConnected(true);
      setMessage('Wallet connected successfully!');
      setMessageType('success');
      
      // Store signer reference for later use
      setSigner(true);
      
      setTimeout(() => setActiveStep('upload'), 1500);
    } catch (error) {
      setMessage('Failed to connect wallet: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Sign message for authentication
  const signMessage = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Web3 wallet not found');
      }

      const message = `Authenticate for NFT deployment: ${Date.now()}`;
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      return { signature, message };
    } catch (error) {
      throw new Error('Failed to sign message: ' + error.message);
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setMessage('File too large. Max 10MB');
        setMessageType('error');
        return;
      }

      setArtFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setArtPreview(event.target.result);
      };
      reader.readAsDataURL(file);
      setMessage('Image ready for upload');
      setMessageType('success');
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Deploy NFT with authentication
  const deployNFT = async () => {
    if (!artFile || !formData.title) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setDeploymentStatus('signing');
    setMessage('Please sign the authentication message...');
    setMessageType('info');

    try {
      // Step 1: Sign message for authentication
      const { signature, message } = await signMessage();
      
      setDeploymentStatus('uploading');
      setMessage('Uploading to IPFS...');

      // Step 2: Upload to IPFS via backend
      const formDataToSend = new FormData();
      formDataToSend.append('file', artFile);
      formDataToSend.append('walletAddress', walletAddress);
      formDataToSend.append('signature', signature);
      formDataToSend.append('message', message);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);

      const ipfsResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/upload-ipfs`,
        {
          method: 'POST',
          headers: {
            'walletAddress': walletAddress,
            'signature': signature,
            'message': message
          },
          body: formDataToSend
        }
      );

      if (!ipfsResponse.ok) {
        throw new Error('IPFS upload failed');
      }

      const ipfsData = await ipfsResponse.json();
      const ipfsHash = ipfsData.ipfsHash;

      setDeploymentStatus('deploying');
      setMessage('Deploying smart contract...');

      // Step 3: Deploy contract via backend
      const deployResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/deploy-contract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'walletAddress': walletAddress,
            'signature': signature,
            'message': message
          },
          body: JSON.stringify({
            ipfsHash,
            contractName: formData.contractName,
            contractSymbol: formData.contractSymbol,
            royalty: parseInt(formData.royalty),
            edition: parseInt(formData.edition)
          })
        }
      );

      if (!deployResponse.ok) {
        throw new Error('Contract deployment failed');
      }

      const deployData = await deployResponse.json();
      setContractAddress(deployData.contractAddress);

      setDeploymentStatus('success');
      setMessage('NFT contract deployed successfully!');
      setMessageType('success');

      setTimeout(() => {
        setActiveStep('summary');
      }, 1500);

    } catch (error) {
      setDeploymentStatus('error');
      setMessage('Deployment failed: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setConnected(false);
    setWalletAddress('');
    setSigner(null);
    setActiveStep('wallet');
    setMessage('');
    setDeploymentStatus(null);
    setArtFile(null);
    setArtPreview('');
    setContractAddress('');
    setFormData({
      title: '',
      description: '',
      edition: '1',
      royalty: '10',
      contractName: 'MyArtNFT',
      contractSymbol: 'ART'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Artist NFT Studio</h1>
          <p className="text-purple-300">Deploy your art as NFTs in minutes</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden border border-purple-500 border-opacity-20">
          
          {/* Wallet Connection Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">
                {connected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet Not Connected'}
              </span>
            </div>
            {connected && (
              <button onClick={disconnect} className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                Disconnect
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step 1: Connect Wallet */}
            {!connected ? (
              <div className="text-center py-8">
                <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-4">Connect Your Wallet</h2>
                <p className="text-slate-300 mb-6">Connect your Web3 wallet to get started</p>
                <button
                  onClick={connectWallet}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            ) : activeStep === 'upload' ? (
              /* Step 2: Upload and Metadata */
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white">Create Your NFT</h2>
                
                {/* Art Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Art File *</label>
                  <div className="border-2 border-dashed border-purple-500 rounded-lg p-8 text-center hover:border-purple-400 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="art-upload"
                    />
                    <label htmlFor="art-upload" className="cursor-pointer flex flex-col items-center">
                      {artPreview ? (
                        <>
                          <img src={artPreview} alt="Preview" className="w-32 h-32 object-cover rounded mb-2" />
                          <span className="text-sm text-purple-300">Click to change</span>
                        </>
                      ) : (
                        <>
                          <FileImage className="w-12 h-12 text-purple-400 mb-2" />
                          <span className="text-slate-300">Click to upload or drag and drop</span>
                          <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="My Amazing Artwork"
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Tell collectors about your artwork..."
                    rows="3"
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Edition and Royalty */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Edition Size</label>
                    <input
                      type="number"
                      name="edition"
                      value={formData.edition}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Royalty % (0-25)</label>
                    <input
                      type="number"
                      name="royalty"
                      value={formData.royalty}
                      onChange={handleFormChange}
                      min="0"
                      max="25"
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                {/* Contract Settings */}
                <div className="bg-slate-700 p-4 rounded space-y-3">
                  <h3 className="font-semibold text-white text-sm">Contract Settings</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contract Name</label>
                    <input
                      type="text"
                      name="contractName"
                      value={formData.contractName}
                      onChange={handleFormChange}
                      className="w-full bg-slate-600 text-white px-3 py-1 rounded text-sm border border-slate-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contract Symbol</label>
                    <input
                      type="text"
                      name="contractSymbol"
                      value={formData.contractSymbol}
                      onChange={handleFormChange}
                      maxLength="5"
                      className="w-full bg-slate-600 text-white px-3 py-1 rounded text-sm border border-slate-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded flex items-center gap-2 ${
                    messageType === 'success' ? 'bg-green-500 bg-opacity-20 text-green-300' :
                    messageType === 'error' ? 'bg-red-500 bg-opacity-20 text-red-300' :
                    'bg-blue-500 bg-opacity-20 text-blue-300'
                  }`}>
                    {messageType === 'success' && <CheckCircle className="w-4 h-4" />}
                    {messageType === 'error' && <AlertCircle className="w-4 h-4" />}
                    {message}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setActiveStep('upload')}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deployNFT}
                    disabled={loading || !artFile}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    {loading ? 'Deploying...' : 'Deploy NFT'}
                  </button>
                </div>
              </div>
            ) : activeStep === 'summary' ? (
              /* Step 3: Summary */
              <div className="text-center py-8 space-y-6">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">NFT Deployed Successfully!</h2>
                  <p className="text-slate-300 mb-4">Your artwork is now live on the blockchain</p>
                </div>
                
                <div className="bg-slate-700 p-6 rounded space-y-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Title:</span>
                    <span className="text-white font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Edition:</span>
                    <span className="text-white font-medium">{formData.edition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Royalty:</span>
                    <span className="text-white font-medium">{formData.royalty}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Network:</span>
                    <span className="text-white font-medium">Polygon</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Contract:</span>
                    <a 
                      href={`https://polygonscan.com/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-medium text-sm truncate"
                    >
                      {contractAddress.slice(0, 10)}...
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveStep('upload');
                      setArtFile(null);
                      setArtPreview('');
                      setContractAddress('');
                      setFormData({
                        title: '',
                        description: '',
                        edition: '1',
                        royalty: '10',
                        contractName: 'MyArtNFT',
                        contractSymbol: 'ART'
                      });
                      setMessage('');
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition"
                  >
                    Deploy Another NFT
                  </button>
                  <button
                    onClick={disconnect}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Powered by IPFS, ERC-1155, and Polygon Network</p>
        </div>
      </div>
    </div>
  );
}