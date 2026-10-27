{
  description = "A very basic flake with a development shell";

  inputs = {
    cratedocs-mcp.url = "github:tacogips/cratedocs-mcp";
    bravesearch-mcp.url = "github:tacogips/bravesearch-mcp";
    hn-mcp.url = "github:tacogips/hn-mcp";
    nixpkgs.url = "github:tacogips/nixpkgs-security/d2a93d2fe7820d90eaa10af53891412ec3614f56";
  };

  # Share the patched Node.js and CA bundle across transitive development inputs.
  inputs.bravesearch-mcp.inputs.nixpkgs.follows = "nixpkgs";
  inputs.cratedocs-mcp.inputs.nixpkgs.follows = "nixpkgs";
  inputs.hn-mcp.inputs.nixpkgs.follows = "nixpkgs";

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
          pnpm
          cratedocs-mcp.packages.${system}.default
          bravesearch-mcp.packages.${system}.default
          hn-mcp.packages.${system}.default
        ];

        shellHook = ''
          echo "Node.js $(${pkgs.nodejs_22}/bin/node --version) and pnpm $(${pkgs.pnpm}/bin/pnpm --version) are available in this shell"
        '';
      };
    };
}
