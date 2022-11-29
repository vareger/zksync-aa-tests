pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestContract{

    uint256 public totalCap;
    IERC20 public basicToken;

    event Deposit(address indexed writer, uint256 amount);
    event Withdraw(address indexed writer, uint256 amount);

    constructor(address _basicToken){
        basicToken = IERC20(_basicToken);
    }


    /**
    * deposit ERC20 tokens function, assigns Liquidity tokens to provided address.
    * @param amount - amount to deposit
    * @param to - address to assign liquidity tokens to
    */
    function depositTo(
        uint256 amount,
        address to
    ) external {
        require(basicToken.transferFrom(msg.sender, address(this), amount), "Can't transfer token");
        totalCap += amount;
        emit Deposit(to, amount);
    }

    /**
    * converts spefied amount of Liquidity tokens to Basic Token and returns to user (withdraw). The balance of the User (msg.sender) is decreased by specified amount of Liquidity tokens. 
    * Resulted amount of tokens are transferred to specified address
    * @param amount - amount of liquidity tokens to exchange to Basic token.
    * @param to - address to send resulted amount of tokens to
     */
    function withdrawTo(
        uint256 amount,
        address to
    ) external 
    {
        totalCap -= amount;
        basicToken.transfer(to, amount);
        emit Withdraw(msg.sender, amount);
    }

    function _deposit(uint256 amount, address to) private {
        require(basicToken.transferFrom(msg.sender, address(this), amount), "Can't transfer token");
        totalCap += amount;
        emit Deposit(to, amount);
    }

    function _withdraw(uint256 amountLiquidity, address to) private {
        totalCap -= amountLiquidity;
        basicToken.transfer(to, amountLiquidity);
        emit Withdraw(msg.sender, amountLiquidity);
    }
}