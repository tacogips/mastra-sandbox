{
  description = "A very basic flake with a development shell";

  inputs = {
    cratedocs-mcp.url = "github:tacogips/cratedocs-mcp";
    bravesearch-mcp.url = "github:tacogips/bravesearch-mcp";
    hn-mcp.url = "github:tacogips/hn-mcp";
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
      cratedocs-mcp,
      bravesearch-mcp,
      hn-mcp,
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

    in
    {
      # Use only the system variable for packages
      packages.${system} = {
        hello = pkgs.hello;
        default = pkgs.hello;
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_22
          nodePackages.pnpm
          cratedocs-mcp.packages.${system}.default
          bravesearch-mcp.packages.${system}.default
          hn-mcp.packages.${system}.default
        ];

        shellHook = ''
          echo "Node.js $(${pkgs.nodejs_22}/bin/node --version) and pnpm $(${pkgs.nodePackages.pnpm}/bin/pnpm --version) are available in this shell"
        '';
      };
    };
}
