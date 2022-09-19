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
    mapping(address => mapping(uint256 => uint256)) userContributionInPhase;
    mapping(address => uint256) userStake;
    mapping(address => uint256) phaseCalculated;

    //Reward user got for each phase, non-zero mean user got reward
    mapping(address => uint256) rewardUserGotInPhase;

    uint256 public currentPhase;
    uint256 public totalStake;

    IERC20Upgradeable stakeToken;
    IERC20Upgradeable rewardToken;

    event PhaseStarted(uint256 indexed currentPhase, uint256 duration);
    event UserStaked(address indexed user, uint256 amount);

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

    function stake(uint256 stakeAmount) public {
        _updateUserContribution(msg.sender);

        uint256 timeLeft = _timeLeft();
        if (timeLeft > 0) {
            phases[currentPhase - 1].totalContribution += timeLeft * stakeAmount;
            userContributionInPhase[msg.sender][currentPhase - 1] += timeLeft * stakeAmount;
        }

        totalStake += stakeAmount;
        userStake[msg.sender] += stakeAmount;

        emit UserStaked(msg.sender, stakeAmount);
    }

    function _updateUserContribution(address user) internal {
        uint256[] memory result = _calculateUserContribution(user);
        for (uint256 i = phaseCalculated[user]; i < currentPhase; i++) {
            userContributionInPhase[user][i] = result[i];
        }
        phaseCalculated[user] = currentPhase;
    }

    function _calculateUserContribution(address user) internal view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](currentPhase);
        for (uint256 i = 0; i < phaseCalculated[user]; i++) {
            result[i] = userContributionInPhase[user][i];
        }

        for (uint256 i = phaseCalculated[user]; i < currentPhase; i++) {
            result[i] = userStake[user] * phases[i].duration;
        }
        return result;
    }

    /**
     @notice Calculate how time left in current live phase, if no live phase return 0
     @dev Use for calculate how much contribution is added or subtracted
     */
    function _timeLeft() private view returns (uint256) {
        PhaseInfo memory currentPhaseInfo = phases[currentPhase - 1];
        if (currentPhaseInfo.startTime <= block.timestamp && currentPhaseInfo.startTime + currentPhaseInfo.duration > block.timestamp) {
            return currentPhaseInfo.duration - (block.timestamp - currentPhaseInfo.startTime);
        } else {
            return 0;
        }
    }
}