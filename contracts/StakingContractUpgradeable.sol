// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract StakingContractUpgradeable is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20PermitUpgradeable;

    struct PhaseInfo {
        uint256 startTime;
        uint256 duration;
        uint256 totalReward;
        uint256 totalContribution;
    }

    PhaseInfo[] public phases;

    //Distribution of user for each phase
    mapping(address => uint256) userContributionInPhase;

    //Reward user got for each phase, non-zero mean user got reward
    mapping(address => uint256) rewardUserGotInPhase;

    uint256 public currentPhase;
    uint256 public totalStake;

    IERC20Upgradeable stakeToken;
    IERC20Upgradeable rewardToken;

    event PhaseStarted(uint256 indexed currentPhase, uint256 duration);

    function initialize(address stakeToken_, address rewardToken_) public initializer {
        stakeToken = IERC20Upgradeable(stakeToken_);
        rewardToken = IERC20Upgradeable(rewardToken_);
    }

    function startPhase(uint256 duration_) external onlyOwner {
        require(
            currentPhase == 0 
            || phases[currentPhase - 1].startTime + phases[currentPhase - 1].duration < block.timestamp,
            "startPhase::Previous phase not ended"
        );
        PhaseInfo storage currentPhaseInfo = phases[currentPhase];
        currentPhaseInfo.startTime = block.timestamp;
        currentPhaseInfo.duration = duration_;
        currentPhaseInfo.totalContribution = totalStake * duration_;

        currentPhase += 1;
        emit PhaseStarted(currentPhase, duration_);
    }
}