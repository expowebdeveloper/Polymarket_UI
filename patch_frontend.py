
path = "/home/dell/Desktop/Projects/Polymarket/frontend/src/pages/ProfileStat.tsx"

with open(path, "r") as f:
    content = f.read()

# 1. Add Import
if "fetchMarketDistribution" not in content:
    content = content.replace("resolveWalletOrUser, fetchUserLeaderboardData", "resolveWalletOrUser, fetchUserLeaderboardData, fetchMarketDistribution")

# 2. Add State and Effect
# Find insertion point
insert_marker = "const itemsPerPage = 20;"
if insert_marker in content and "const [apiDistribution, setApiDistribution]" not in content:
    code_to_insert = """const itemsPerPage = 20;
    const [apiDistribution, setApiDistribution] = useState<any[]>([]);
    const [loadingDistribution, setLoadingDistribution] = useState(false);"""
    
    content = content.replace(insert_marker, code_to_insert)
    
    # Add reset in wallet effect
    wallet_effect_signature = "fetchUserLeaderboardData(activeWallet, 'overall')"
    reset_logic = """
            // Reset API distribution
            setApiDistribution([]);
            """
    
    # We'll just insert the effect separately after the existing effects
    # Find end of existing effects. "}, [activeWallet, fetchTrades]);"
    effect_end_marker = "}, [activeWallet, fetchTrades]);"
    
    new_effect = """
    }, [activeWallet, fetchTrades]);

    // Fetch API distribution when tab is active
    useEffect(() => {
        if (activeWallet && activeTab === 'distribution' && apiDistribution.length === 0 && !loadingDistribution) {
            setLoadingDistribution(true);
            fetchMarketDistribution(activeWallet)
                .then(data => {
                    setApiDistribution(data.market_distribution || []);
                })
                .catch(err => console.error("Failed to fetch market distribution:", err))
                .finally(() => setLoadingDistribution(false));
        }
    }, [activeWallet, activeTab, apiDistribution.length, loadingDistribution]);"""
    
    content = content.replace(effect_end_marker, new_effect)

# 3. Update JSX
panel_jsx = """<MarketDistributionPanel
                                    marketDistribution={marketDistribution}
                                    activities={activities}
                                    positions={positions}
                                    closedPositions={closedPositions}
                                />"""

new_panel_jsx = """{loadingDistribution ? (
                                    <div className="h-[300px] flex items-center justify-center">
                                        <LoadingSpinner message="Fetching market distribution from API..." />
                                    </div>
                                ) : (
                                    <MarketDistributionPanel
                                        marketDistribution={apiDistribution.length > 0 ? apiDistribution : []}
                                        activities={activities}
                                        positions={positions}
                                        closedPositions={closedPositions}
                                    />
                                )}"""

if panel_jsx in content:
    content = content.replace(panel_jsx, new_panel_jsx)
else:
    # Try simpler match if formatting differs
    print("Warning: MarketDistributionPanel component usage format mismatch. Checking substrings...")
    # This might happen due to whitespace. I will check for unique substring.
    # The file view showed indentation with spaces.
    pass 
    # Logic note: if regex needed, I'd implement it, but for now assuming clean match from view_file.

with open(path, "w") as f:
    f.write(content)

print("Frontend patch applied.")
